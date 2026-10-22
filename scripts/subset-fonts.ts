/**
 * Regenerate every font the site ships from its pristine source.
 *
 * Only the glyphs this site can actually render are kept. The four display faces
 * read their originals from src/assets/fonts-full/ (committed, never copied into
 * dist); the two LXGW body faces (articles and travelogue descriptions) read the
 * upstream WenKai GB TTF, which is 25 MB and so lives in the gitignored
 * scripts/.fonts/ and is downloaded on first use.
 *
 * Never derive a text face from a previously shipped subset: subsetting can
 * only remove glyphs, so that path loses characters permanently and does it
 * silently. This is also why the body face switched to the upstream TTF - the
 * 1.4 MB woff2 the theme shipped was itself an early subset holding just 2,947
 * code points, so 228 of the hanzi in the articles had never rendered in this
 * face. The U+0020-only chrome faces at the end are the deliberate exception:
 * they are intentionally reduced to one invisible glyph and never stand in for
 * a text face.
 *
 * Usage: corepack pnpm subset-fonts [--dry]
 * After running it, bump the `?v=` cache key on every URL that points at a
 * regenerated file (src/styles/font.css, src/styles/lxgw-wenkai-body.css,
 * src/layouts/Head.astro), otherwise returning readers keep the old subset.
 */
import { Buffer } from 'node:buffer'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const REPO = process.cwd()
const DRY = process.argv.includes('--dry')

interface Face {
  /** What it is and where it applies, for the log line. */
  label: string
  /** Original outlines - the only thing this script ever reads. */
  source: string
  dest: string
  /**
   * Release URL for an original too large to commit. Fetched once into
   * `source`, which lives under the gitignored scripts/.fonts/.
   */
  download?: string
  /**
   * Keep the whole printable ASCII block regardless of whether the site uses
   * it. Reader comments render inside #post-content, so any character a
   * visitor types must stay available.
   */
  keepBasicLatin?: boolean
  /**
   * Which character pool this face is cut from. `global` (default) covers all
   * post/about content; `album` only covers src/data/albums.ts, so travelogue
   * pages can ship a ~110 KB description face instead of the ~375 KB article
   * face. Both come from the same source and keep the same outlines.
   */
  pool?: 'global' | 'album'
  /**
   * Fixed characters instead of a pool. Used for the U+0020-only chrome faces;
   * their source is the already-shipped subset in public/fonts (the glyph is a
   * space, so deriving it cannot lose any visible outline). STIX needs one
   * extra glyph: a subset holding only a contourless space trips Chrome's OTS
   * "glyf: zero-length table" check.
   */
  text?: string
}
const FACES: Face[] = [
  {
    label: 'LXGW WenKai GB 正文（#post-content, .detail-description）',
    // The site has always shipped LXGWWenKaiGB-Regular (name#6 of the file at
    // src/assets/fonts-full/), so the source must be the GB edition too - the
    // same-version non-GB release is a different set of outlines and rewrites
    // 631 of the glyphs already in use.
    source: 'scripts/.fonts/lxgw-gb-source.ttf',
    download: 'https://github.com/lxgw/LxgwWenkaiGB/releases/download/v1.522/LXGWWenKaiGB-Regular.ttf',
    dest: 'public/fonts/lxgw-wenkai-body-400.woff2',
    keepBasicLatin: true,
  },
  {
    label: 'LXGW WenKai GB 游记简介（.detail-description）',
    source: 'scripts/.fonts/lxgw-gb-source.ttf',
    download: 'https://github.com/lxgw/LxgwWenkaiGB/releases/download/v1.522/LXGWWenKaiGB-Regular.ttf',
    dest: 'public/fonts/lxgw-wenkai-album-400.woff2',
    keepBasicLatin: true,
    pool: 'album',
  },
  {
    label: 'Snell Black（font-title 招牌）',
    source: 'src/assets/fonts-full/Snell-Black-SF.woff2',
    dest: 'public/fonts/Snell-Black-SF.woff2',
    keepBasicLatin: true,
  },
  {
    label: 'Snell Bold（font-time 日期）',
    source: 'src/assets/fonts-full/Snell-Bold-SF.woff2',
    dest: 'public/fonts/Snell-Bold-SF.woff2',
    keepBasicLatin: true,
  },
  {
    label: 'STIX（font-subtitle, font-serif）',
    source: 'src/assets/fonts-full/STIX-VF.woff2',
    dest: 'public/fonts/STIX-VF.woff2',
    keepBasicLatin: true,
  },
  {
    label: 'STIX Italic（font-navbar 导航）',
    source: 'src/assets/fonts-full/STIX-Italic-VF.woff2',
    dest: 'public/fonts/STIX-Italic-VF.woff2',
    keepBasicLatin: true,
  },
  // Must stay after the three full faces above: these read the newly written
  // subsets, so the space glyph/advance always matches what ships.
  {
    label: '字体空格：Snell Black（只保留空格）',
    source: 'public/fonts/Snell-Black-SF.woff2',
    dest: 'public/fonts/Snell-Black-Space.woff2',
    text: ' ',
  },
  {
    label: '字体空格：STIX（只保留空格）',
    source: 'public/fonts/STIX-VF.woff2',
    dest: 'public/fonts/STIX-Space.woff2',
    text: ' x',
  },
  {
    label: '字体空格：STIX Italic（只保留空格）',
    source: 'public/fonts/STIX-Italic-VF.woff2',
    dest: 'public/fonts/STIX-Italic-Space.woff2',
    text: ' x',
  },
]

// ── Collect every code point the site can render ──
const chars = new Set<string>()
// The travelogue description face only ever renders src/data/albums.ts copy.
const albumChars = new Set<string>()

function addTo(target: Set<string>, text: string) {
  for (const ch of text)
    target.add(ch)
}

function addChars(text: string) {
  addTo(chars, text)
}

function walk(dir: string, exts: RegExp) {
  if (!fs.existsSync(dir))
    return
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name)
    if (entry.isDirectory())
      walk(p, exts)
    else if (exts.test(entry.name))
      addChars(fs.readFileSync(p, 'utf8'))
  }
}

walk('src/content', /\.mdx?$/)
walk('src/i18n', /\.(?:ts|json)$/)
walk('src', /\.astro$/)
walk('src/components', /\.(?:ts|js)$/)
// src/data holds the travelogue copy that .detail-description renders in the
// body face, plus the music panel's titles - leaving it out ships fallback
// glyphs on those pages.
walk('src/data', /\.(?:ts|json)$/)
addChars(fs.readFileSync('src/config.ts', 'utf8'))
addTo(albumChars, fs.readFileSync('src/data/albums.ts', 'utf8'))

const collected = [...chars]
  .filter(ch => !/\s/.test(ch))
  .sort((a, b) => a.codePointAt(0)! - b.codePointAt(0)!)
// Whitespace is dropped by the collector above because it is noise in source
// text, but a missing space glyph is not: it silently changes the advance of
// every run that contains one. Keep the blanks, plus all of printable ASCII so
// a comment or a future post cannot reach for a fallback face.
const always = []
for (let cp = 0x20; cp <= 0x7E; cp++)
  always.push(String.fromCodePoint(cp))
for (const cp of [0xA0, 0x3000, 0x2002, 0x2003, 0x2004, 0x2005, 0x2006, 0x2007, 0x2008, 0x2009, 0x200A, 0x202F])
  always.push(String.fromCodePoint(cp))

let subsetFont
try {
  const pkg = 'subset-font'
  subsetFont = (await import(/* @vite-ignore */ pkg)).default
}
catch {
  console.error('缺少依赖 subset-font，先运行: corepack pnpm add -D subset-font')
  process.exit(1)
}

let touched = 0
for (const face of FACES) {
  const src = path.resolve(REPO, face.source)
  const dest = path.resolve(REPO, face.dest)
  if (!fs.existsSync(src) && face.download) {
    console.log(`下载原始字体 → ${path.relative(REPO, src)}`)
    const res = await fetch(face.download)
    if (!res.ok) {
      console.error(`下载失败 ${res.status} ${face.download}`)
      process.exit(1)
    }
    fs.mkdirSync(path.dirname(src), { recursive: true })
    fs.writeFileSync(src, Buffer.from(await res.arrayBuffer()))
  }
  if (!fs.existsSync(src)) {
    console.error(`缺少原始字体 ${path.relative(REPO, src)} —— 子集只能从原始轮廓重建，已中止`)
    process.exit(1)
  }
  const original = fs.readFileSync(src)
  const sourcePool = face.pool === 'album' ? [...albumChars] : collected
  const pool = face.text !== undefined
    ? [...new Set(face.text)]
    : (face.keepBasicLatin ? [...new Set([...sourcePool, ...always])] : sourcePool)
  const text = pool.join('')
  const out = await subsetFont(original, text, { targetFormat: 'woff2' })

  const shipped = fs.existsSync(dest) ? fs.readFileSync(dest) : null
  if (out.length >= original.length) {
    console.error(`${face.label}: 子集 ${out.length} B 没有小于原始 ${original.length} B，跳过`)
    continue
  }
  const delta = shipped ? `${shipped.length} → ${out.length} B (${((out.length / shipped.length - 1) * 100).toFixed(1)}%)` : `新建 ${out.length} B`
  console.log(`${face.label.padEnd(46)} 候选 ${String(pool.length).padStart(5)} 字 → ${out.length.toString().padStart(8)} B   ${delta}`)
  if (!DRY && shipped && shipped.equals(out)) {
    continue
  }
  if (!DRY) {
    fs.writeFileSync(dest, out)
    touched++
  }
}
if (DRY)
  console.log('（--dry：未写入任何文件）')
else
  console.log(`已更新 ${touched} 个文件；记得把 ?v= 缓存键一起改掉`)
