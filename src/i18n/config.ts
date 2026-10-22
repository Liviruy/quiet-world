// Global Language Map
export const langMap = {
  en: ['en-US'],
  zh: ['zh-CN'],
} as const

// Supported Languages
export type Language = keyof typeof langMap

// Twikoo Language Map
// https://github.com/twikoojs/twikoo/blob/main/src/client/utils/i18n/index.js
export const twikooLocaleMap: Record<Language, string> = {
  en: 'en',
  zh: 'zh-cn',
}
