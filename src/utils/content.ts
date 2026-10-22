import type { CollectionEntry } from 'astro:content'
import type { Language } from '@/i18n/config'
import type { Post } from '@/types'
import { getCollection, render } from 'astro:content'
import { allLocales, defaultLocale } from '@/config'
import { memoize } from '@/utils/cache'

const metaCache = new Map<string, { minutes: number }>()

/**
 * Add metadata including reading time to a post
 *
 * @param post The post to enhance with metadata
 * @returns Enhanced post with reading time information
 */
async function addMetaToPost(post: CollectionEntry<'posts'>): Promise<Post> {
  const cacheKey = `${post.id}-${post.data.lang || 'universal'}`
  const cachedMeta = metaCache.get(cacheKey)
  if (cachedMeta) {
    return {
      ...post,
      remarkPluginFrontmatter: cachedMeta,
    }
  }

  const { remarkPluginFrontmatter } = await render(post)
  const meta = remarkPluginFrontmatter as { minutes: number }
  metaCache.set(cacheKey, meta)

  return {
    ...post,
    remarkPluginFrontmatter: meta,
  }
}

/**
 * Find duplicate post slugs within the same language
 *
 * @param posts Array of blog posts to check
 * @returns Array of descriptive error messages for duplicate slugs
 */
export async function checkPostSlugDuplication(posts: CollectionEntry<'posts'>[]): Promise<string[]> {
  const slugMap = new Map<string, Set<string>>()
  const duplicates: string[] = []

  const claimSlug = (slug: string, lang: string, message: string) => {
    let slugSet = slugMap.get(lang)
    if (!slugSet) {
      slugSet = new Set()
      slugMap.set(lang, slugSet)
    }
    if (!slugSet.has(slug)) {
      slugSet.add(slug)
      return
    }
    if (!duplicates.includes(message))
      duplicates.push(message)
  }

  posts.forEach((post) => {
    const lang = post.data.lang
    const slug = post.data.abbrlink || post.id

    // A universal post is emitted into every language route, so it must be
    // compared against each language's bucket — not just other universal posts.
    if (!lang) {
      for (const locale of allLocales) {
        claimSlug(slug, locale, `Duplicate slug "${slug}" found in universal post (applies to all languages)`)
      }
      return
    }

    claimSlug(slug, lang, `Duplicate slug "${slug}" found in "${lang}" language post`)
  })

  return duplicates
}

/**
 * Get all posts (including pinned ones, excluding drafts in production)
 *
 * @param lang The language code to filter by, defaults to site's default language
 * @returns Posts filtered by language, enhanced with metadata, sorted by date
 */
async function _getPosts(lang?: Language) {
  const currentLang = lang || defaultLocale

  const filteredPosts = await getCollection(
    'posts',
    ({ data }: CollectionEntry<'posts'>) => {
      // Show drafts in dev mode only
      const shouldInclude = import.meta.env.DEV || !data.draft
      return shouldInclude && (data.lang === currentLang || data.lang === '')
    },
  )

  const enhancedPosts = await Promise.all(filteredPosts.map(addMetaToPost))

  return enhancedPosts.sort((a, b) => {
    const dateOrder = b.data.published.valueOf() - a.data.published.valueOf()
    if (dateOrder !== 0)
      return dateOrder

    // Keep same-day posts deterministic so list and adjacent navigation agree.
    return (b.data.abbrlink || b.id).localeCompare(a.data.abbrlink || a.id)
  })
}

export const getPosts = memoize(_getPosts)

/**
 * Get the previous and next posts relative to a given post
 *
 * Posts are ordered by published date descending (newest first).
 * "newer" points to the more recent neighbor, "older" to the earlier one.
 *
 * @param slug The current post's slug (abbrlink or id)
 * @param lang The language code to filter by, defaults to site's default language
 * @returns Object with `newer` and `older` posts (or null at the ends)
 */
async function _getAdjacentPosts(slug: string, lang?: Language) {
  const posts = await getPosts(lang)
  const currentIndex = posts.findIndex(post =>
    (post.data.abbrlink || post.id) === slug,
  )

  if (currentIndex === -1) {
    return { newer: null, older: null }
  }

  // posts[0] is newest; index-1 is newer, index+1 is older
  const newer = currentIndex > 0 ? posts[currentIndex - 1] : null
  const older = currentIndex < posts.length - 1 ? posts[currentIndex + 1] : null

  return { newer, older }
}

export const getAdjacentPosts = memoize(_getAdjacentPosts)
