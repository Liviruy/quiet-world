import type { APIRoute } from 'astro'
import { allLocales } from '@/config'
import { getLangFromLocale, getLangRouteParam } from '@/i18n/lang'
import { getPosts } from '@/utils/content'
import { getPostDescription } from '@/utils/description'

// Pre-generate static paths for each language (and the default-locale root)
export async function getStaticPaths() {
  return allLocales.map(lang => ({
    params: { lang: getLangRouteParam(lang) },
  }))
}

// Build a lightweight search index for the current language:
// { title, description, tags, date, url } for every (non-draft) post.
// Fetched client-side by the search modal; filtered in the browser.
export const GET: APIRoute = async ({ currentLocale }) => {
  const lang = getLangFromLocale(currentLocale)
  const posts = await getPosts(lang)

  const index = posts.map((post) => {
    const slug = post.data.abbrlink || post.id
    return {
      title: post.data.title,
      description: getPostDescription(post, 'meta'),
      tags: post.data.tags ?? [],
      date: post.data.published.toISOString().slice(0, 10),
      slug,
    }
  })

  return new Response(JSON.stringify(index), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      // Index is stable per build; allow long caching
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
