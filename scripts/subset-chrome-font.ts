/*
 * 重新生成"站体常用字"合并子集：把 masthead / 导航里用 EarlySummer 出的那几个汉字合成
 * 一个 woff2，取代早先"一个字一个文件"的 10 份切片（403,712 B / 10 个请求 → 8,260 B / 1 个）。
 *
 * 源字体不在仓库里（EarlySummer Serif VF，OFL 约 25 MB，只在下一次改站名/导航文案时才需要）：
 *   https://github.com/GuiWonder/EarlySummerSerif/releases → EarlySummerSerifVF.zip
 * 解压出 EarlySummerSerif-VF.otf。**只能用 OTF 那份**：实测拿 TTF 切出来的字形与现有渲染
 * 逐像素不同（二次贝塞尔 vs CFF2），OTF 则完全一致。
 *
 * 依赖 subset-font（harfbuzzjs 的切分子集器）：
 *   corepack pnpm add -D subset-font
 *   corepack pnpm exec tsx scripts/subset-chrome-font.ts <路径>/EarlySummerSerif-VF.otf
 *
 * 产物 public/fonts/EarlySummer-Chrome.woff2 是要提交的；脚本另外打印 unicode-range，
 * 必须与 src/styles/font.css 里那份保持一致，否则字形会静默掉回系统字体。
 */
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

// 站名"清静世界"、副标题"觅一处安静角落"、导航"文章/关于/游记/摄影"里由 EarlySummer 出字形码点。
const CHROME_CHARS = '于关文章觅摄静世落游影清界角安记处一'

const sourceArg = process.argv[2]
if (!sourceArg) {
  console.error('用法: tsx scripts/subset-chrome-font.ts <EarlySummerSerif-VF.otf>')
  process.exit(1)
}
const source = path.resolve(sourceArg)
if (!fs.existsSync(source)) {
  console.error(`找不到源字体: ${source}`)
  console.error('请先从 GitHub release 下载 EarlySummerSerifVF.zip 并解压出 .otf（不要用 .ttf）')
  process.exit(1)
}

let subsetFont
try {
  // Optional tool dependency, resolved by name at runtime so the site build and
  // type-check don't require it to be installed.
  const pkg = 'subset-font'
  subsetFont = (await import(/* @vite-ignore */ pkg)).default
}
catch {
  console.error('缺少依赖 subset-font，先运行: corepack pnpm add -D subset-font')
  process.exit(1)
}

const out = await subsetFont(fs.readFileSync(source), CHROME_CHARS, { targetFormat: 'woff2' })
const dest = path.resolve('public/fonts/EarlySummer-Chrome.woff2')
fs.mkdirSync(path.dirname(dest), { recursive: true })
fs.writeFileSync(dest, out)

const ranges = [...new Set(CHROME_CHARS)]
  .map(ch => ch.codePointAt(0)!)
  .sort((a, b) => a - b)
  .map(cp => `U+${cp.toString(16).toUpperCase().padStart(4, '0')}`)
  .join(', ')

console.log(`写出 ${path.relative(process.cwd(), dest)} — ${out.length} 字节`)
console.log(`码点 ${ranges.split(', ').length} 个`)
console.log('font.css 里的 unicode-range 应为：')
console.log(`  unicode-range: ${ranges};`)
