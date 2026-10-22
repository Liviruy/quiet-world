const R2_PUBLIC_BASE = 'https://music.artist.cc.cd'

const THUMBNAIL_WIDTHS = [320, 480, 640, 960, 1200, 1600] as const

// Bump this when the Worker starts serving pre-generated thumbnails so old
// edge/browser entries (which were produced by Image Resizing) are bypassed.
const THUMB_CACHE_VERSION = '20261022'

function normalizePath(path: string) {
  return path.replace(/^\/+/, '')
}

export function getR2ImagePath(id: number | string) {
  return `images/${id}.webp`
}

export function normalizeR2ThumbnailWidth(width: number) {
  return THUMBNAIL_WIDTHS.find(candidate => candidate >= width) ?? THUMBNAIL_WIDTHS.at(-1)!
}

export function getR2OriginalUrl(path: string) {
  const normalizedPath = normalizePath(path)

  if (import.meta.env.PROD) {
    return `/media/original/${normalizedPath}`
  }

  return `${R2_PUBLIC_BASE}/${normalizedPath}`
}

export function getR2ThumbnailUrl(path: string, width = 640) {
  const normalizedPath = normalizePath(path)
  const normalizedWidth = normalizeR2ThumbnailWidth(width)

  if (import.meta.env.PROD) {
    return `/media/thumb/${normalizedPath}?w=${normalizedWidth}&v=${THUMB_CACHE_VERSION}`
  }

  // Keep local preview independent from the production Worker.
  return `${R2_PUBLIC_BASE}/${normalizedPath}`
}

/**
 * Lightbox rendition as a `{w}` template, so the client can pick the width
 * bucket from the reader's real stage size. Handing back a finished URL would
 * force one fixed width for every viewport, and the hover-prefetch plus the
 * `<img>` request must resolve to the *same* URL or the prefetch is wasted.
 * In dev this points at the plain R2 object, where width is irrelevant.
 */
export function getR2LightboxTemplate(path: string) {
  const normalizedPath = normalizePath(path)

  if (import.meta.env.PROD) {
    return `/media/thumb/${normalizedPath}?w={w}&v=${THUMB_CACHE_VERSION}`
  }

  return `${R2_PUBLIC_BASE}/${normalizedPath}`
}

/**
 * Build a srcset of thumbnail widths for responsive selection.
 * Returns undefined in dev, where thumbnails are plain R2 URLs and a srcset
 * of identical URLs would only confuse the browser.
 */
export function getR2ThumbnailSrcSet(path: string, widths: number[]) {
  if (!import.meta.env.PROD) {
    return undefined
  }
  const normalizedPath = normalizePath(path)
  return widths
    .map((width) => {
      const normalizedWidth = normalizeR2ThumbnailWidth(width)
      return `/media/thumb/${normalizedPath}?w=${normalizedWidth}&v=${THUMB_CACHE_VERSION} ${normalizedWidth}w`
    })
    .join(', ')
}
