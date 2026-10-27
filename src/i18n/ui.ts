import type { Language } from '@/i18n/config'

interface Translation {
  title: string
  subtitle: string
  posts: string
  about: string
  travelog: string
  gallery: string
  toc: string
}

export const ui: Record<Language, Translation> = {
  en: {
    title: 'Quiet World',
    subtitle: 'Find a quiet corner',
    posts: 'Posts',
    about: 'About',
    travelog: 'Travelog',
    gallery: 'Gallery',
    toc: 'Table of Contents',
  },
  zh: {
    title: '清静世界',
    subtitle: '觅一处安静角落',
    posts: '文章',
    about: '关于',
    travelog: '随记',
    gallery: '随拍',
    toc: '目录',
  },
}
