/**
 * Cap locally processed post images at the display width.
 *
 * Astro's sharp service converts local markdown images to WebP but emits them
 * at source resolution: a 1920px photo rendered at ~704px wide still downloads
 * 300-550 KB. Capping width at 1600px (content container max on desktop) with
 * quality 78 - the same settings the remote-image worker already uses -
 * removes most of the over-shipping without any visible difference.
 *
 * Usage: pnpm exec tsx scripts/cap-local-images.ts [targetDir]
 * (default target: dist/_astro after a build)
 */
import type { Buffer } from 'node:buffer'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import sharp from 'sharp'

const MAX_WIDTH = 1600
const QUALITY = 78

const dir = process.argv[2] ? path.resolve(process.argv[2]) : path.resolve('dist/_astro')

// Collect .webp files in the target dir, recursively.
function collectWebp(d: string): string[] {
  if (!fs.existsSync(d))
    return []
  const out: string[] = []
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name)
    if (e.isDirectory())
      out.push(...collectWebp(p))
    else if (e.name.endsWith('.webp'))
      out.push(p)
  }
  return out
}

// Last-resort fallback for a persistent Windows file lock: one short-lived
// node process per file, copying the staged bytes over the target.
// The in-process retry loop can hit a lock that survives it, but a clean
// process usually gets through. Worker source is written to a unique temp
// file per call so two fallbacks can never race.
const freshWorkerCode = [
  'import fs from \'node:fs\'',
  'const target = process.argv[2]',
  'const staged = process.argv[3]',
  'fs.copyFileSync(staged, target)',
  '',
].join('\n')

function writeViaFreshProcess(file: string, out: Buffer, original: Buffer): boolean {
  const workerFile = path.join(process.cwd(), 'node_modules', '.cache', `cap-worker-${path.basename(file)}.mjs`)
  const staged = `${file}.cap-staged~`
  fs.mkdirSync(path.dirname(workerFile), { recursive: true })
  fs.writeFileSync(workerFile, freshWorkerCode)
  fs.writeFileSync(staged, out)
  try {
    const r = spawnSync(process.execPath, [workerFile, file, staged], { stdio: 'pipe', timeout: 60000 })
    if (r.status === 0 && fs.statSync(file).size === out.length)
      return true
    // worker failed: make sure the original is intact
    if (!fs.existsSync(file) || fs.statSync(file).size !== original.length)
      fs.writeFileSync(file, original)
    return false
  }
  finally {
    fs.rmSync(staged, { force: true })
    fs.rmSync(workerFile, { force: true })
  }
}

const candidates = collectWebp(dir)

let changed = 0
let failed = 0
for (const file of candidates) {
  // sharp() must receive bytes, never a path: with a path libvips keeps the
  // file mapped, and every later write to that same file - including the
  // restore and the fresh-process fallback, which run while this process is
  // still alive - fails with `UNKNOWN: unknown error, open` on Windows.
  const original = fs.readFileSync(file)
  const meta = await sharp(original).metadata()
  const source = original.length
  if (!meta.width || meta.width <= MAX_WIDTH || source === 0) {
    console.log(`${path.relative(process.cwd(), file)}: ${meta.width ?? '?'}px, ${source} B - kept`)
    continue
  }

  // Encode from the bytes already read (not a fresh handle on the target),
  // then overwrite in place. A temp-file rename would fail on Windows while
  // antivirus still scans the file astro just wrote; an in-place write works.
  const out = await sharp(original)
    .resize({ width: MAX_WIDTH, withoutEnlargement: true })
    .webp({ quality: QUALITY })
    .toBuffer()
  const after = out.length
  if (after >= source) {
    console.log(`${path.relative(process.cwd(), file)}: ${meta.width}px re-encode would grow ${source} B to ${after} B - kept original`)
    continue
  }

  // Windows quirk: the first overwrite right after sharp/antivirus touched
  // the file can fail with UNKNOWN; a few spaced retries clear it. A failed
  // writeFileSync opens the target with O_TRUNC, so back it up first and
  // restore it before the script can abort.
  const bak = `${file}.cap-bak~`
  fs.copyFileSync(file, bak)
  let written = false
  for (let attempt = 0; attempt < 5 && !written; attempt++) {
    try {
      fs.writeFileSync(file, out)
      written = true
    }
    catch {
      // restore the original before the next attempt
      if (!fs.existsSync(file) || fs.statSync(file).size !== source)
        fs.copyFileSync(bak, file)
      await new Promise(r => setTimeout(r, 1000 * (attempt + 1)))
    }
  }
  fs.rmSync(bak, { force: true })
  if (!written) {
    console.log(`${path.relative(process.cwd(), file)}: in-process write locked, retrying via fresh process`)
    written = writeViaFreshProcess(file, out, original)
    if (!written) {
      // last-ditch: original was already capped to be safe; keep as is
      console.log(`${path.relative(process.cwd(), file)}: still locked after fresh process - kept original`)
      failed++
      continue
    }
  }
  if (fs.statSync(file).size !== after)
    throw new Error(`write verification failed for ${file}`)
  changed++
  console.log(`${path.relative(process.cwd(), file)}: ${meta.width} -> ${MAX_WIDTH}px, ${source} B -> ${after} B (-${((1 - after / source) * 100).toFixed(0)}%)`)
}

console.log(`done: ${changed}/${candidates.length} files re-encoded${failed ? `, ${failed} skipped after write failures` : ''}`)
