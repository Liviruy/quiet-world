import { base, moreLocales } from '@/config'
import { getLangFromPath } from '@/i18n/lang'
import { getLocalizedPath } from '@/i18n/path'

// Determine if the path matches a specific page type
function matchPageType(path: string, prefix: string = '', requireChild = false) {
  // Remove base path if configured
  const pathWithoutBase = base && path.startsWith(base)
    ? path.slice(base.length)
    : path

  // Remove leading and trailing slashes from the path
  const normalizedPath = pathWithoutBase.replace(/^\/|\/$/g, '')

  // Homepage check: matches root path ('') or an enabled language code ('en')
  if (prefix === '') {
    return normalizedPath === '' || (moreLocales as readonly string[]).includes(normalizedPath)
  }

  // Ensure strict segment boundary matching to prevent partial matches
  const startsWithSegment = (target: string, segment: string) =>
    requireChild
      ? target.startsWith(`${segment}/`)
      : target === segment || target.startsWith(`${segment}/`)

  // Match both default language paths and localized paths
  return startsWithSegment(normalizedPath, prefix)
    || moreLocales.some(lang => startsWithSegment(normalizedPath, `${lang}/${prefix}`))
}

export function isHomePage(path: string) {
  return matchPageType(path)
}

export function isPostPage(path: string) {
  return matchPageType(path, 'posts')
}

export function isAboutPage(path: string) {
  return matchPageType(path, 'about')
}

export function isAlbumsPage(path: string) {
  return matchPageType(path, 'albums')
}

// Only /albums/<slug>/ renders .detail-description, the one block that reads in
// the 1.4 MB LXGW WenKai body face. The album index must not preload it.
export function isAlbumsDetailPage(path: string) {
  return matchPageType(path, 'albums', true)
}

export function isGalleryPage(path: string) {
  return matchPageType(path, 'photos')
}

// Returns page context with language, page types and localization helper
export function getPageInfo(path: string) {
  const currentLang = getLangFromPath(path)
  const isHome = isHomePage(path)
  const isPost = isPostPage(path)
  const isAbout = isAboutPage(path)
  const isAlbums = isAlbumsPage(path)
  const isAlbumsDetail = isAlbumsDetailPage(path)
  const isGallery = isGalleryPage(path)

  return {
    currentLang,
    isHome,
    isPost,
    isAbout,
    isAlbums,
    isAlbumsDetail,
    isGallery,
    getLocalizedPath: (targetPath: string) =>
      getLocalizedPath(targetPath, currentLang),
  }
}
