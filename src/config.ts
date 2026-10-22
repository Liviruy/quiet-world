import type { ThemeConfig } from '@/types'

export const themeConfig: ThemeConfig = {
  // SITE INFORMATION >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> START
  site: {
    // site title
    title: 'Quiet World',
    // site subtitle
    subtitle: 'Revive the beauty of typography',
    // Site author. Used by meta author, JSON-LD, and the RSS/Atom feeds.
    // Matches the GitHub handle in the footer links below.
    author: 'Liviruy',
    // ╔══════════════════════════════════════════════════════════════════════╗
    // ║  Production site URL. Used for canonical, OG/Twitter tags, JSON-LD,    ║
    // ║  sitemap, and RSS/Atom feeds. Matches the wrangler.jsonc custom domain.║
    // ╚══════════════════════════════════════════════════════════════════════╝
    url: 'https://artist.cc.cd',
    // base path
    // root directory for all pages and assets
    base: '/', // e.g., '/blog', '/docs'
    // favicon url
    // recommended formats: svg, png or ico
    favicon: '/icons/favicon-love.png', // or https://example.com/favicon.svg
  },
  // SITE INFORMATION >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> END

  // COLOR SETTINGS >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> START
  color: {
    // default theme mode
    // 'auto' = a reader who has not chosen yet follows the OS. The toggle and
    // the stored 'theme' key always win over this (see isCurrentDark in Head).
    mode: 'auto', // light | dark | auto
    light: {
      // primary color
      // used for title, hover, etc
      // oklch color picker: https://oklch.com/
      primary: 'oklch(25% 0.005 298)',
      // secondary color
      // used for post text
      secondary: 'oklch(40% 0.005 298)',
      // background color
      background: 'oklch(96% 0.005 298)',
      // highlight color
      // used for navbar, selected text, etc
      highlight: 'oklch(0.93 0.195089 103.2532 / 0.5)', // rgba(255,235,0,0.5)
    },
    dark: {
      // primary color
      primary: 'oklch(92% 0.005 298)',
      // secondary color
      secondary: 'oklch(77% 0.005 298)',
      // background color
      background: 'oklch(22% 0.005 298)',
      // highlight color
      highlight: 'oklch(0.93 0.195089 103.2532 / 0.2)', // rgba(255,235,0,0.2)
    },
    // Extra color schemes the visitor can cycle through with the palette
    // button (see 主题配色指南). Values are the OKLCH "L C H" triplets used
    // inside oklch(); the highlight color stays shared across all schemes.
    themes: [
      {
        id: 'congbai',
        name: '葱白',
        nameEn: 'Congbai',
        light: {
          primary: '25% 0.03 211.86',
          secondary: '40% 0.03 211.86',
          background: '99% 0.0039 106.47',
        },
        dark: {
          primary: '92% 0.0015 106.47',
          secondary: '79% 0.0015 106.47',
          background: '24% 0.0039 106.47',
        },
      },
      {
        id: 'yaqing',
        name: '鸦青',
        nameEn: 'Yaqing',
        light: {
          primary: '24% 0.0172 280.05',
          secondary: '40% 0.0172 280.05',
          background: '98% 0.0172 280.05',
        },
        dark: {
          primary: '92% 0.0172 280.05',
          secondary: '79% 0.0172 280.05',
          background: '24% 0.0172 280.05',
        },
      },
      {
        id: 'molan',
        name: '墨蓝',
        nameEn: 'Molan',
        light: {
          primary: '24% 0.053 261.24',
          secondary: '39% 0.053 261.24',
          background: '100% 0 0',
        },
        dark: {
          primary: '92% 0 0',
          secondary: '79% 0 0',
          background: '24% 0.016 265.21',
        },
      },
      {
        id: 'mihuang',
        name: '米黄',
        nameEn: 'Mihuang',
        light: {
          primary: '25% 0 0',
          secondary: '41% 0 0',
          background: '95% 0.0237 59.39',
        },
        dark: {
          primary: '93% 0.019 59.39',
          secondary: '80% 0.017 59.39',
          background: '23% 0 0',
        },
      },
    ],
  },
  // COLOR SETTINGS >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> END

  // GLOBAL SETTINGS >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> START
  global: {
    // default language
    locale: 'zh', // zh | en
    // more languages
    // not fill in the locale code above again, can be an empty array []
    moreLocales: ['en'],
    // post font style
    fontStyle: 'sans', // sans | serif
    // post date format
    dateFormat: 'YYYY-MM-DD', // YYYY-MM-DD | MM-DD-YYYY | DD-MM-YYYY | MMM D YYYY | D MMM YYYY
    // enable table of contents
    toc: true, // true | false
    // enable katex math rendering
    katex: false, // true | false
    // reduce motion
    reduceMotion: false, // true | false
  },
  // GLOBAL SETTINGS >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> END

  // COMMENT SETTINGS >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> START
  comment: {
    // enable comment system
    enabled: true, // true | false
    // Twikoo — https://twikoo.js.org/
    twikoo: {
      // EdgeOne Makers deployment (twikoo-eo, Blob storage)
      // Admin panel: gear icon in the comment widget (no separate /admin page)
      envId: 'https://twikoo.artist.cc.cd',
      // version: frontend version can be changed in package.json
    },
  },
  // COMMENT SETTINGS >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> END

  // FOOTER SETTINGS >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> START
  footer: {
    // social links
    links: [
      // {
      // name: 'RSS',
      // url: '/atom.xml', // or /rss.xml
      // },
      {
        name: 'GitHub',
        url: 'https://github.com/Liviruy',
      },
      // {
      //   name: 'X',
      //   url: 'https://x.com/radishzz_',
      // },
    ],
    // year of website start
    // startYear: 2025,
  },
  // FOOTER SETTINGS >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> END

  // PRELOAD SETTINGS >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> START
  preload: {
    // image hosting url
    // optimize remote images and generate low-quality placeholders
    imageHostURL: 'music.artist.cc.cd',
  },
  // PRELOAD SETTINGS >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> END
}

export const base = themeConfig.site.base === '/' ? '' : themeConfig.site.base.replace(/\/$/, '')
export const defaultLocale = themeConfig.global.locale
export const moreLocales = themeConfig.global.moreLocales
export const allLocales = [defaultLocale, ...moreLocales]
