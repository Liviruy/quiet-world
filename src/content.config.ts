import { readdirSync } from 'node:fs'
import { join } from 'node:path'
import process from 'node:process'
import { glob } from 'astro/loaders'
import { z } from 'astro/zod'
import { defineCollection } from 'astro:content'
import { allLocales, themeConfig } from '@/config'

// Posts must be named `<slug>-zh.md` or `<slug>-en.md` (zh + en are the only
// published languages). Anything else would be silently skipped by the glob
// loader below, so warn loudly about those files at config load time — this
// runs on every `astro dev` and `astro build`.
function warnAboutMisnamedPostFiles() {
  try {
    const baseDir = join(process.cwd(), 'src', 'content', 'posts')
    const files = readdirSync(baseDir, { recursive: true })
      .map(file => String(file).replace(/\\/g, '/'))
      .filter(file => /\.(?:md|mdx)$/i.test(file))
    const misnamed = files.filter(file => !/-(?:zh|en)\.(?:md|mdx)$/i.test(file))
    if (misnamed.length > 0) {
      const lines = [
        '',
        '╔════════════════════════════════════════════════════════════════════╗',
        '║  ⚠️  发现不符合命名规则的文章文件，它们不会被构建成页面！              ║',
        '║  文章必须以 -zh.md 或 -en.md 结尾，例如：我的文章-zh.md               ║',
        '╠════════════════════════════════════════════════════════════════════╣',
      ]
      for (const file of misnamed) {
        lines.push(`║  src/content/posts/${file}`)
      }
      lines.push('╚════════════════════════════════════════════════════════════════════╝')
      console.warn(lines.join('\n'))
    }
  }
  catch {
    // Never let the guard itself break the build.
  }
}

warnAboutMisnamedPostFiles()

const posts = defineCollection({
  loader: glob({
    pattern: '**/*-{en,zh}.{md,mdx}',
    base: './src/content/posts',
  }),
  schema: z.object({
    // required
    title: z.string(),
    published: z.date(),
    // optional
    description: z.string().optional().default(''),
    updated: z.preprocess(
      val => val === '' ? undefined : val,
      z.date().optional(),
    ),
    tags: z.array(z.string()).optional().default([]),
    // Advanced
    draft: z.boolean().optional().default(false),
    pin: z.number().int().min(0).max(99).optional().default(0),
    toc: z.boolean().optional().default(themeConfig.global.toc),
    lang: z.enum(['', ...allLocales]).optional().default(''),
    abbrlink: z.string().optional().default('').refine(
      abbrlink => !abbrlink || /^[a-z0-9\-]*$/.test(abbrlink),
      { message: 'Abbrlink can only contain lowercase letters, numbers and hyphens' },
    ),
  }),
})

const about = defineCollection({
  loader: glob({ pattern: '**/*-{en,zh}.{md,mdx}', base: './src/content/about' }),
  schema: z.object({
    lang: z.enum(['', ...allLocales]).optional().default(''),
  }),
})

export const collections = { posts, about }
