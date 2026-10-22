/**
 * Add responsive variants to locally hosted article images.
 *
 * Runs after `astro build` and `cap-local-images` (dist images are already
 * capped at 1600px). For every image inside #post-content / .about-content it
 * creates 800w and 1200w WebP siblings and adds srcset/sizes, leaving the
 * original 1600px file as the high-density candidate. Width/height attributes,
 * LQIP styles and lazy-loading are untouched.
 *
 * The content column is 44rem (704px) on desktop and 85.5vw below 1024px
 * (the page padding is 7.25vw per side), so the browser can pick 800w on a
 * phone instead of downloading the full 1600px screenshot.
 *
 * Usage: tsx scripts/responsive-post-images.ts   (wired into `pnpm build`)
 */
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import fg from 'fast-glob'
import { parse } from 'node-html-parser'
import sharp from 'sharp'

const DIST = 'dist'
const PAGES = [
  'posts/**/index.html',
  'en/posts/**/index.html',
  'about/index.html',
  'en/about/index.html',
]
const WIDTHS = [800, 1200]
const QUALITY = 78
const SIZES = '(min-width: 1024px) 704px, 85.5vw'

async function main() {
  const pages = await fg(PAGES, { cwd: DIST, absolute: true })
  const generated = new Map<string, number>()
  let changedPages = 0
  let addedImages = 0
  let addedBytes = 0

  for (const page of pages) {
    const root = parse(fs.readFileSync(page, 'utf8'))
    const images = root.querySelectorAll('#post-content img, .about-content img')
    let changed = false

    for (const img of images) {
      const src = img.getAttribute('src')
      if (!src || !src.startsWith('/') || src.startsWith('/media/') || img.getAttribute('srcset'))
        continue

      const srcPath = src.split('?')[0]
      const originalFile = path.join(DIST, srcPath.replace(/^\//, ''))
      if (!fs.existsSync(originalFile))
        continue

      const original = fs.readFileSync(originalFile)
      const meta = await sharp(original).metadata()
      const originalWidth = meta.width
      if (!originalWidth || originalWidth <= WIDTHS[0])
        continue

      const ext = path.extname(srcPath)
      const base = srcPath.slice(0, -ext.length)
      const candidates: { width: number, url: string }[] = []

      for (const width of WIDTHS) {
        if (width >= originalWidth)
          continue
        const url = `${base}-${width}${ext}`
        let bytes = generated.get(url)
        if (bytes === undefined) {
          const out = await sharp(original)
            .resize({ width, withoutEnlargement: true })
            .webp({ quality: QUALITY })
            .toBuffer()
          if (out.length >= original.length)
            continue
          fs.writeFileSync(path.join(DIST, url.replace(/^\//, '')), out)
          bytes = out.length
          generated.set(url, bytes)
          addedBytes += bytes
        }
        candidates.push({ width, url })
      }

      if (candidates.length === 0)
        continue

      candidates.push({ width: originalWidth, url: src })
      candidates.sort((a, b) => a.width - b.width)
      img.setAttribute('srcset', candidates.map(c => `${c.url} ${c.width}w`).join(', '))
      img.setAttribute('sizes', SIZES)
      changed = true
      addedImages++
    }

    if (changed) {
      fs.writeFileSync(page, root.toString())
      changedPages++
    }
  }

  console.log(`[responsive] ${addedImages} images on ${changedPages}/${pages.length} pages; ${generated.size} new variants, ${Math.round(addedBytes / 1024)} KB`)
}

main().catch((error) => {
  console.error('[responsive] failed:', error)
  process.exit(1)
})
