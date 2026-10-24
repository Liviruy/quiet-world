interface Env {
  ASSETS: {
    fetch: (request: RequestInfo | URL, init?: RequestInit) => Promise<Response>
  }
  R2_PUBLIC_BASE: string
}

type ImageFormat = 'avif' | 'webp'

type ImageFetchInit = RequestInit & {
  cf?: {
    image?: {
      width: number
      fit: 'scale-down'
      quality: number
      format?: ImageFormat
    }
  }
}

const CACHE_CONTROL = 'public, max-age=31536000, s-maxage=31536000, immutable'
const ERROR_CACHE_CONTROL = 'private, max-age=0, no-store'
const ORIGIN_TIMEOUT_MS = 8000
const THUMBNAIL_WIDTHS = [320, 480, 640, 960, 1200, 1600] as const

function getThumbnailWidth(value: string | null) {
  const requested = Number.parseInt(value ?? '', 10)
  const safeWidth = Number.isFinite(requested) ? Math.max(320, requested) : 640
  return THUMBNAIL_WIDTHS.find(width => width >= safeWidth) ?? THUMBNAIL_WIDTHS.at(-1)!
}

function getImageFormat(request: Request): ImageFormat | undefined {
  const accept = request.headers.get('Accept') ?? ''
  if (accept.includes('image/avif'))
    return 'avif'
  if (accept.includes('image/webp'))
    return 'webp'
  return undefined
}

// Allowlist, not just parsing: this Worker is public, so the route must only
// ever reach flat image keys under images/ - never ../, never another bucket
// prefix, never an arbitrary URL. Photo keys used to be all digits (images/13)
// and are now dated (images/Ph260926a), so the name part allows letters too.
function getSourcePath(pathname: string, prefix: string) {
  const sourcePath = pathname.slice(prefix.length)
  return /^images\/[\w-]+\.webp$/i.test(sourcePath) ? sourcePath : null
}

function getOriginUrl(path: string, env: Env) {
  const base = (env.R2_PUBLIC_BASE || '').replace(/\/+$/, '')
  return `${base}/${path}`
}

function copyRequestHeaders(request: Request) {
  const headers = new Headers()
  const accept = request.headers.get('Accept')
  if (accept)
    headers.set('Accept', accept)
  return headers
}

function withCacheHeaders(response: Response, varyByAccept = false) {
  const headers = new Headers(response.headers)
  // Never let a transient origin 404/5xx be pinned for a year — immutable
  // error responses turn into permanently broken images.
  headers.set('Cache-Control', response.ok ? CACHE_CONTROL : ERROR_CACHE_CONTROL)
  headers.set('CDN-Cache-Control', response.ok ? CACHE_CONTROL : ERROR_CACHE_CONTROL)
  if (varyByAccept)
    headers.set('Vary', 'Accept')
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}

async function fetchFromOrigin(url: string, init: RequestInit = {}): Promise<Response> {
  try {
    return await fetch(url, { ...init, signal: AbortSignal.timeout(ORIGIN_TIMEOUT_MS) })
  }
  catch {
    // Unreachable/misconfigured R2 origin: fail fast with a cacheable-nowhere 502.
    return new Response('Upstream image origin unavailable', { status: 502 })
  }
}

async function serveOriginal(request: Request, env: Env, sourcePath: string) {
  const response = await fetchFromOrigin(getOriginUrl(sourcePath, env), {
    method: request.method === 'HEAD' ? 'HEAD' : 'GET',
    headers: copyRequestHeaders(request),
  })
  return withCacheHeaders(response)
}

// Pre-generated renditions live under thumbs/<image-stem>-<width>.<format>.
// They are produced by scripts/r2-thumbnails.ts from the live resize Worker,
// so falling back to Image Resizing keeps exactly the same bytes if an object
// is ever missing.
function getPrebuiltKey(sourcePath: string, width: number, format: ImageFormat) {
  const stem = sourcePath.replace(/^images\//, '').replace(/\.webp$/i, '')
  return `thumbs/${stem}-${width}.${format}`
}

async function servePrebuiltThumbnail(request: Request, env: Env, sourcePath: string, width: number) {
  const format = getImageFormat(request)
  if (!format)
    return null
  const response = await fetchFromOrigin(getOriginUrl(getPrebuiltKey(sourcePath, width, format), env), {
    headers: copyRequestHeaders(request),
  })
  return response.ok ? withCacheHeaders(response, true) : null
}

async function serveThumbnail(request: Request, env: Env, sourcePath: string, width: number) {
  const prebuilt = await servePrebuiltThumbnail(request, env, sourcePath, width)
  if (prebuilt)
    return prebuilt

  const imageOptions: NonNullable<NonNullable<ImageFetchInit['cf']>['image']> = {
    width,
    fit: 'scale-down',
    quality: 78,
  }
  const format = getImageFormat(request)
  if (format)
    imageOptions.format = format

  const response = await fetchFromOrigin(getOriginUrl(sourcePath, env), {
    method: 'GET',
    headers: copyRequestHeaders(request),
    cf: {
      image: imageOptions,
    },
  } as ImageFetchInit)

  return withCacheHeaders(response, true)
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    // HTML is served directly by Workers Assets, so an HTTP→HTTPS redirect
    // here would only cover /media requests. Use the zone's Always Use HTTPS
    // setting instead (the primary zone already has it; enable it for the
    // secondary zone in the Cloudflare dashboard).
    if (url.pathname.startsWith('/media/thumb/')) {
      const sourcePath = getSourcePath(url.pathname, '/media/thumb/')
      if (!sourcePath)
        return new Response('Not found', { status: 404 })
      return serveThumbnail(request, env, sourcePath, getThumbnailWidth(url.searchParams.get('w')))
    }

    if (url.pathname.startsWith('/media/original/')) {
      const sourcePath = getSourcePath(url.pathname, '/media/original/')
      if (!sourcePath)
        return new Response('Not found', { status: 404 })
      return serveOriginal(request, env, sourcePath)
    }

    return env.ASSETS.fetch(request)
  },
}
