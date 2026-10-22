/**
 * Mirror every music cover to R2 and write src/data/music-covers.json.
 *
 * Apple's mzstatic CDN is the only external image dependency left in the music
 * panel; on a slow mainland connection opening the panel can leave rows blank
 * until each cover arrives. This downloads the current cover for all tracks,
 * normalizes it to a 300x300 WebP and uploads it as:
 *
 *   images/music-cover-<track-id>.webp
 *
 * The generated JSON is the runtime cover registry; src/data/music.ts falls
 * back to music-metadata.json for tracks added before this script is re-run.
 *
 * Usage:
 *   CLOUDFLARE_API_TOKEN=... pnpm r2-music-covers
 */
import { Buffer } from 'node:buffer'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'
import sharp from 'sharp'
import { musicTracks } from '../src/data/music'

const ACCOUNT = process.env.CLOUDFLARE_ACCOUNT_ID
const BUCKET = process.env.R2_BUCKET

if (!ACCOUNT || !BUCKET) {
  console.error('缺少 CLOUDFLARE_ACCOUNT_ID 或 R2_BUCKET。')
  process.exit(1)
}
const URL_BASE = 'https://music.artist.cc.cd/images'
const OUTPUT = 'src/data/music-covers.json'

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

async function upload(key: string, body: ArrayBuffer) {
  const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${ACCOUNT}/r2/buckets/${BUCKET}/objects/${key}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'image/webp',
    },
    body,
    signal: AbortSignal.timeout(60_000),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`${key}: HTTP ${res.status} ${text.slice(0, 160)}`)
  }
}

const registry: Record<string, string> = {}

for (const track of musicTracks) {
  if (!track.cover) {
    console.warn(`[covers] ${track.id}: no source cover, skipped`)
    continue
  }
  if (track.cover.startsWith(`${URL_BASE}/music-cover-`)) {
    registry[track.id] = track.cover
    continue
  }
  const res = await fetch(track.cover, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
    signal: AbortSignal.timeout(45_000),
  })
  if (!res.ok)
    throw new Error(`${track.id}: cover HTTP ${res.status}`)
  const source = Buffer.from(await res.arrayBuffer())
  const webp = await sharp(source)
    .resize(300, 300, { fit: 'cover' })
    .webp({ quality: 82 })
    .toBuffer()
  const key = `images/music-cover-${track.id}.webp`
  await upload(key, webp.buffer.slice(webp.byteOffset, webp.byteOffset + webp.byteLength) as ArrayBuffer)
  registry[track.id] = `${URL_BASE}/${key.replace(/^images\//, '')}`
  console.log(`[covers] ${track.id}: ${webp.length} B`)
}

fs.writeFileSync(OUTPUT, `${JSON.stringify(registry, null, 2)}\n`)
console.log(`[covers] wrote ${Object.keys(registry).length} entries to ${OUTPUT}`)
