import type { AttributifyAttributes } from '@unocss/preset-attributify'

declare global {
  namespace astroHTML.JSX {
    interface HTMLAttributes extends AttributifyAttributes {}
  }

  interface Window {
    webkitAudioContext: typeof AudioContext
    __themeToggleRegistered?: boolean
    __backButtonRegistered?: boolean
    __musicLauncherBound?: boolean
    __langSwitchReplace?: boolean
    __onSiteSession?: boolean
    __albumBackStepRegistered?: boolean
  }
  interface Document {
    startViewTransition: (updateCallback: () => void) => ViewTransition
  }

  interface ViewTransition {
    finished: Promise<void>
    ready: Promise<void>
    updateCallbackDone: Promise<void>
  }
}

export {}
