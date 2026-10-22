import type { Node } from 'node-html-parser'
/**
 * Give every Chinese article its own body-font subset.
 *
 * Runs after `astro build` (dist already exists). For each built /posts/ page it
 * collects the characters that actually render in the reading face, cuts a
 * subset from the shipped full body font, and injects:
 *   - a preload for that one small woff2
 *   - an @font-face + `--reading-font` on #post-content
 * The full-face preload is removed from these pages. Comments keep the full
 * face via src/styles/lxgw-wenkai-body.css and only fetch it when the lazy
 * comment widget renders.
 *
 * Deriving from the shipped body subset is deliberate: this operation only
 * removes glyphs, and the full face remains the fallback. No new characters
 * can be introduced that the fallback does not already have.
 *
 * Usage: tsx scripts/subset-post-fonts.ts   (wired into `pnpm build`)
 */
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import fg from 'fast-glob'
import { HTMLElement, parse } from 'node-html-parser'

const DIST = 'dist'
const POST_GLOB = 'posts/**/index.html'
const SOURCE = 'public/fonts/lxgw-wenkai-body-400.woff2'
const OUT_DIR = 'dist/fonts/posts'
const GENERATION = 'post-font-v1'

const always = new Set<string>()
for (let cp = 0x20; cp <= 0x7E; cp++) always.add(String.fromCodePoint(cp))
for (const cp of [0xA0, 0x3000, 0x2002, 0x2003, 0x2004, 0x2005, 0x2006, 0x2007, 0x2008, 0x2009, 0x200A, 0x202F]) always.add(String.fromCodePoint(cp))
// CSS-generated quotes (markdown.css) and everyday CJK punctuation can appear
// without being present in the text nodes, so keep them in every article face.
for (const ch of '「」『』“”‘’—…·、，。！？；：（）《》〈〉【】〔〕')
  always.add(ch)

let subsetFont
try {
  const pkg = 'subset-font'
  subsetFont = (await import(/* @vite-ignore */ pkg)).default
}
catch {
  console.warn('[post-font] subset-font unavailable, keeping the full body face')
  process.exit(0)
}

if (!fs.existsSync(SOURCE)) {
  console.warn(`[post-font] ${SOURCE} missing, keeping the full body face`)
  process.exit(0)
}

const source = fs.readFileSync(SOURCE)
fs.rmSync(OUT_DIR, { recursive: true, force: true })
fs.mkdirSync(OUT_DIR, { recursive: true })

interface PageFont {
  page: string
  bytes: number
  chars: number
}

const written = new Map<string, number>()
const results: PageFont[] = []

function collectChars(root: HTMLElement) {
  const content = root.querySelector('#post-content')
  if (!content)
    return null

  const chars = new Set(always)
  const walk = (node: Node) => {
    if (node instanceof HTMLElement) {
      const tag = String(node.tagName ?? '').toLowerCase()
      if (['pre', 'code', 'script', 'style', 'svg'].includes(tag))
        return
      if (node.getAttribute('id') === 'twikoo-wrapper')
        return
      if (node.classList.contains('post-nav'))
        return
      for (const child of node.childNodes)
        walk(child)
      return
    }
    if (node.nodeType === 3) {
      for (const ch of node.rawText ?? '') {
        if (!/\s/.test(ch))
          chars.add(ch)
      }
    }
  }

  for (const child of content.childNodes)
    walk(child)

  return chars
}

for (const file of await fg(POST_GLOB, { cwd: DIST, absolute: true })) {
  let html = fs.readFileSync(file, 'utf8')
  const root = parse(html)
  const chars = collectChars(root)
  if (!chars || chars.size <= always.size)
    continue

  const pool = [...chars]
  const text = pool.join('')
  const hash = createHash('sha1')
    .update(GENERATION)
    .update(source)
    .update('\0')
    .update(text)
    .digest('hex')
    .slice(0, 10)
  const fileName = `${hash}.woff2`
  const outFile = path.join(OUT_DIR, fileName)

  let bytes: number
  const cached = written.get(hash)
  if (cached !== undefined) {
    bytes = cached
  }
  else {
    const out = await subsetFont(source, text, { targetFormat: 'woff2' })
    if (out.length >= source.length) {
      console.warn(`[post-font] ${path.relative(DIST, file)}: subset did not shrink, kept full face`)
      continue
    }
    fs.writeFileSync(outFile, out)
    bytes = out.length
    written.set(hash, bytes)
  }

  const family = `LXGW Post ${hash}`
  const style = `<style id="post-reading-font">@font-face{font-family:"${family}";font-style:normal;font-display:swap;font-weight:400;src:url("/fonts/posts/${fileName}") format("woff2")}#post-content{--reading-font:"${family}"}</style>`
  const preload = `<link data-post-reading-font rel="preload" href="/fonts/posts/${fileName}" as="font" type="font/woff2" crossorigin>`

  // Idempotent: drop a previous injection, then remove the full-face preload
  // (the @font-face itself stays for comments).
  html = html
    .replace(/<style id="post-reading-font">[\s\S]*?<\/style>/g, '')
    .replace(/<link data-post-reading-font[^>]*>/g, '')
    .replace(/<link[^>]*lxgw-wenkai-body-400\.woff2[^>]*>/g, '')
    .replace(/<head([^>]*)>/, `<head$1>${preload}`)
    .replace('</head>', `${style}</head>`)

  fs.writeFileSync(file, html)
  results.push({ page: path.relative(DIST, file), bytes, chars: pool.length })
}

if (results.length === 0) {
  console.log('[post-font] no Chinese post pages processed')
}
else {
  const values = results.map(r => r.bytes)
  const sum = values.reduce((a, b) => a + b, 0)
  for (const row of results.sort((a, b) => a.bytes - b.bytes))
    console.log(`[post-font] ${row.bytes.toString().padStart(7)} B  ${row.chars.toString().padStart(4)} chars  ${row.page}`)
  console.log(`[post-font] done: ${results.length} pages, ${Math.min(...values)}–${Math.max(...values)} B (sum ${sum} B, unique files ${written.size})`)
}
