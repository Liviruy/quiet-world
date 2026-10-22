import mdx from '@astrojs/mdx'
import sitemap from '@astrojs/sitemap'
import Compress from 'astro-compress'
import { defineConfig } from 'astro/config'
import rehypeKatex from 'rehype-katex'
import rehypeSlug from 'rehype-slug'
import remarkDirective from 'remark-directive'
import remarkMath from 'remark-math'
import UnoCSS from 'unocss/astro'
import { base, defaultLocale, themeConfig } from './src/config'
import { langMap } from './src/i18n/config'
import { rehypeCodeCopyButton } from './src/plugins/rehype-code-copy-button.mjs'
import { rehypeExternalLinks } from './src/plugins/rehype-external-links.mjs'
import { rehypeHeadingAnchor } from './src/plugins/rehype-heading-anchor.mjs'
import { rehypeImageProcessor } from './src/plugins/rehype-image-processor.mjs'
import rehypeMermaidPre from './src/plugins/rehype-mermaid-pre.mjs'
import { rehypeRemoteLazyImages } from './src/plugins/rehype-remote-lazy-images.mjs'
import { remarkContainerDirectives } from './src/plugins/remark-container-directives.mjs'
import { remarkLeafDirectives } from './src/plugins/remark-leaf-directives.mjs'
import { remarkReadingTime } from './src/plugins/remark-reading-time.mjs'
import { remarkRemoteImageHints } from './src/plugins/remark-remote-image-hints.mjs'

const { url: site } = themeConfig.site
const { imageHostURL } = themeConfig.preload ?? {}
const imageConfig = imageHostURL
  ? {
      image: {
        domains: [imageHostURL],
        remotePatterns: [{ protocol: 'https', hostname: imageHostURL.replace(/^https?:\/\//, '').replace(/\/+$/, '') }],
        service: {
          entrypoint: 'astro/assets/services/sharp',
          config: {
            webp: { quality: 78 },
          },
        },
      },
    }
  : {}

export default defineConfig({
  site,
  base,
  trailingSlash: 'always', // Not recommended to change
  prefetch: {
    // Only explicitly marked primary navigation links are prefetched. The
    // viewport strategy starts fetching as soon as a link scrolls into view,
    // which is what makes taps feel instant on mobile where there is no
    // hover; on Chromium these upgrades to full prefetch/prerender.
    prefetchAll: false,
    defaultStrategy: 'viewport', // hover, tap, viewport, load
  },
  ...imageConfig,
  i18n: {
    locales: Object.entries(langMap).map(([path, codes]) => ({
      path,
      codes: [...codes] as [string, ...string[]],
    })),
    defaultLocale,
  },
  integrations: [
    UnoCSS({
      injectReset: true,
    }),
    mdx(),
    // robots.txt advertises /sitemap-index.xml — this integration generates it.
    sitemap(),
    Compress({
      CSS: true,
      HTML: true,
      Image: false,
      JavaScript: true,
      SVG: false,
    }),
  ],
  markdown: {
    remarkPlugins: [
      remarkDirective,
      remarkMath,
      remarkRemoteImageHints,
      remarkContainerDirectives,
      remarkLeafDirectives,
      remarkReadingTime,
    ],
    rehypePlugins: [
      rehypeKatex,
      rehypeMermaidPre,
      rehypeSlug,
      rehypeHeadingAnchor,
      rehypeImageProcessor,
      rehypeRemoteLazyImages,
      rehypeExternalLinks,
      rehypeCodeCopyButton,
    ],
    syntaxHighlight: {
      type: 'shiki',
      excludeLangs: ['mermaid'],
    },
    shikiConfig: {
      // Available themes: https://shiki.style/themes
      themes: {
        light: 'github-light',
        dark: 'github-dark',
      },
    },
  },
  vite: {
    build: {
      chunkSizeWarningLimit: 600,
    },
  },
  devToolbar: {
    enabled: false,
  },
})
