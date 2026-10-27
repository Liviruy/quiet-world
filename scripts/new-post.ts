/**
 * Create a new post with frontmatter.
 *
 * Usage:
 *   pnpm new-post <title-or-path> [zh|en]
 *
 * The generated file is placed in src/content/posts and always gets the
 * language suffix the content loader requires. Pass a path to create it in a
 * subfolder, e.g. `pnpm new-post guides/My Guide en`.
 */

import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { basename, dirname, extname, join } from 'node:path'
import process from 'node:process'
import { themeConfig } from '../src/config'

const rawPath = process.argv[2] ?? 'new-post'
const langArg = process.argv[3] ?? 'zh'

if (langArg !== 'zh' && langArg !== 'en') {
  console.error(`❌ Unsupported language "${langArg}". Use zh or en.`)
  process.exit(1)
}

const hasLanguageSuffix = /-(?:zh|en)$/.test(rawPath.replace(/\.(?:md|mdx)$/i, ''))
const extension = ['.md', '.mdx'].includes(extname(rawPath).toLowerCase())
  ? extname(rawPath)
  : '.md'
const baseName = rawPath.replace(/\.(?:md|mdx)$/i, '')
const targetFile = hasLanguageSuffix
  ? `${baseName}${extension}`
  : `${baseName}-${langArg}${extension}`
const fullPath = join('src/content/posts', targetFile)

if (existsSync(fullPath)) {
  console.error(`❌ File already exists: ${fullPath}`)
  process.exit(1)
}

mkdirSync(dirname(fullPath), { recursive: true })

const title = basename(baseName)
const content = `---
title: ${title}
published: ${new Date().toISOString()}
description: ''
updated: ''
tags:
  - Tag
draft: false
pin: 0
toc: ${themeConfig.global.toc}
lang: ${langArg}
abbrlink: ''
---
`

try {
  writeFileSync(fullPath, content)
  console.log(`✅ Post created: ${fullPath}`)
  console.log('下一步：补全 description，并把 abbrlink 改成小写英文短链。')
}
catch (error) {
  console.error('❌ Failed to create post:', error)
  process.exit(1)
}
