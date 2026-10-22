import type { CollectionEntry } from 'astro:content'
import type { Language } from '@/i18n/config'

export type Post = CollectionEntry<'posts'> & {
  remarkPluginFrontmatter: {
    minutes: number
  }
}

export interface ThemeConfig {
  site: {
    title: string
    subtitle: string
    author: string
    url: string
    base: string
    favicon: string
  }
  color: {
    mode: 'light' | 'dark' | 'auto'
    light: {
      primary: string
      secondary: string
      background: string
      highlight: string
    }
    dark: {
      primary: string
      secondary: string
      background: string
      highlight: string
    }
    /**
     * Optional extra color schemes the visitor can cycle through. Each scheme
     * overrides the four base colors for light and dark mode; the values are
     * the bare OKLCH "L C H" triplets used inside oklch().
     */
    themes?: {
      id: string
      name: string
      nameEn: string
      light: {
        primary: string
        secondary: string
        background: string
      }
      dark: {
        primary: string
        secondary: string
        background: string
      }
    }[]
  }
  global: {
    locale: Language
    moreLocales: Language[]
    fontStyle: 'sans' | 'serif'
    dateFormat: 'YYYY-MM-DD' | 'MM-DD-YYYY' | 'DD-MM-YYYY' | 'MMM D YYYY' | 'D MMM YYYY'
    toc: boolean
    katex: boolean
    reduceMotion: boolean
  }
  comment: {
    enabled: boolean
    twikoo?: {
      envId?: string
    }
  }
  footer: {
    links: {
      name: string
      url: string
    }[]
    startYear?: number
  }
  preload?: {
    imageHostURL?: string
  }
}
