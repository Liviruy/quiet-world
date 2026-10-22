/**
 * Pre-generate the R2 thumbnail renditions used by the album/photo pages.
 *
 * Instead of re-encoding locally and risking a quality/size difference, this
 * asks the live /media/thumb Worker for each canonical AVIF/WebP rendition
 * once, then stores those exact bytes in R2 as:
 *
 *   thumbs/<image-stem>-<width>.{avif,webp}
 *
 * The Worker tries those first and only falls back to Cloudflare Image
 * Resizing when a variant is missing. A unique `gen` query only busts the
 * edge cache during this one-time capture; the Worker ignores it.
 *
 * Usage:
 *   CLOUDFLARE_API_TOKEN=... pnpm r2-thumbnails
 *   CLOUDFLARE_API_TOKEN=... pnpm r2-thumbnails --dry
 *
 * Without CLOUDFLARE_API_TOKEN the script reads the local wrangler OAuth token
 * (same machine that can `wrangler deploy`). Override the source/account/bucket
 * with THUMB_SOURCE_BASE / CLOUDFLARE_ACCOUNT_ID / R2_BUCKET.
 */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'
import { albums } from '../src/data/albums'
import { photosets } from '../src/data/photos'

const SOURCE_BASE = (process.env.THUMB_SOURCE_BASE ?? 'https://artist.cc.cd').replace(/\/+$/, '')
const ACCOUNT = process.env.CLOUDFLARE_ACCOUNT_ID
const BUCKET = process.env.R2_BUCKET

if (!ACCOUNT || !BUCKET) {
  console.error('缺少 CLOUDFLARE_ACCOUNT_ID 或 R2_BUCKET。')
  process.exit(1)
}
const WIDTHS = [320, 480, 640, 960, 1200]
const GEN = process.env.THUMB_GEN ?? `prebuild-${new Date().toISOString().slice(0, 10)}`
const CONCURRENCY = 6
const DRY = process.argv.includes('--dry')
const OUT = 'node_modules/.cache/r2-thumbs'

function readWranglerToken(): string | undefined {
  if (process.env.CLOUDFLARE_API_TOKEN)
    return process.env.CLOUDFLARE_API_TOKEN
  const candidates = [
    process.env.APPDATA && path.join(process.env.APPDATA, 'xdg.config/.wrangler/config/default.toml'),
    path.join(os.homedir(), '.config/.wrangler/config/default.toml'),
  ].filter(Boolean) as string[]
  for (const file of candidates) {
    if (!fs.existsSync(file))
      continue
    const match = fs.readFileSync(file, 'utf8').match(/^oauth_token\s*=\s*"([^"]+)"/m)
    if (match?.[1])
      return match[1]
  }
}

const token = readWranglerToken()
if (!token) {
  console.error('缺少 CLOUDFLARE_API_TOKEN，且找不到 wrangler OAuth token。')
  process.exit(1)
}

const sources = new Set<string>()
for (const set of photosets) {
  for (const image of set.images) sources.add(image.path)
}
for (const album of albums) sources.add(`images/${album.imageId}.webp`)

interface Job {
  source: string
  width: number
  format: 'avif' | 'webp'
}

const jobs: Job[] = []
for (const source of sources) {
  for (const width of WIDTHS) {
    for (const format of ['avif', 'webp'] as const)
      jobs.push({ source, width, format })
  }
}

async function upload(key: string, body: ArrayBuffer, contentType: string) {
  const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${ACCOUNT}/r2/buckets/${BUCKET}/objects/${key}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': contentType,
    },
    body,
    signal: AbortSignal.timeout(60_000),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`${key}: HTTP ${res.status} ${text.slice(0, 160)}`)
  }
}

let done = 0
let skipped = 0
let bytes = 0
const failures: string[] = []

async function run(job: Job) {
  const { source, width, format } = job
  const url = `${SOURCE_BASE}/media/thumb/${source}?w=${width}&gen=${encodeURIComponent(GEN)}`
  try {
    const res = await fetch(url, {
      headers: { Accept: `image/${format}` },
      signal: AbortSignal.timeout(120_000),
    })
    if (!res.ok)
      throw new Error(`HTTP ${res.status}`)
    const contentType = res.headers.get('content-type') ?? ''
    if (!contentType.startsWith(`image/${format}`)) {
      // A source narrower than the requested bucket can make the resize
      // endpoint answer with its native format. Leave that bucket to the live
      // fallback instead of pretending it failed.
      skipped++
      console.warn(`[r2-thumbs] skip ${source} w=${width} ${format}: got ${contentType}`)
      return
    }
    const body = await res.arrayBuffer()
    const key = `thumbs/${source.replace(/^images\//, '').replace(/\.webp$/i, '')}-${width}.${format}`
    if (DRY) {
      const dest = path.join(OUT, key)
      fs.mkdirSync(path.dirname(dest), { recursive: true })
      fs.writeFileSync(dest, new Uint8Array(body))
    }
    else {
      await upload(key, body, contentType)
    }
    bytes += body.byteLength
    done++
    if (done % 20 === 0)
      console.log(`[r2-thumbs] ${done}/${jobs.length} (${(bytes / 1024 / 1024).toFixed(1)} MB)`)
  }
  catch (error) {
    failures.push(`${source} w=${width} ${format}: ${String(error)}`)
    console.warn(`[r2-thumbs] failed ${source} w=${width} ${format}: ${String(error).slice(0, 100)}`)
  }
}

const queue = [...jobs]
await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
  while (queue.length > 0) {
    const job = queue.shift()
    if (job)
      await run(job)
  }
}))

console.log(`[r2-thumbs] ${DRY ? 'dry run' : 'uploaded'}: ${done}/${jobs.length} files, ${(bytes / 1024 / 1024).toFixed(1)} MB, skipped ${skipped}${DRY ? ` in ${OUT}` : ''}`)
if (failures.length > 0) {
  console.error(`[r2-thumbs] ${failures.length} failures`)
  process.exitCode = 1
}
