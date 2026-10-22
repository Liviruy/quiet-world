import type { APIRoute } from 'astro'
import { themeConfig } from '@/config'

export const GET: APIRoute = () => {
  const sitemapURL = new URL('sitemap-index.xml', themeConfig.site.url)

  const robotsTxt = [
    'User-agent: *',
    'Allow: /',
    '',
    `Sitemap: ${sitemapURL.href}`,
  ].join('\n')

  return new Response(robotsTxt, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  })
}
