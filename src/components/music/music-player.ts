import type { MusicTrack as Song } from '@/data/music'
import { musicTracks } from '@/data/music'
import cssUrl from './music-player.css?url'

/* Lazily-imported music player: one native <audio>, one native <dialog>.
   Nothing in this module runs (and no MP3 bytes are fetched) until the first
   click on #music-toggle dynamic-imports it. The ?url import keeps the modal
   CSS out of Astro's per-page style hoisting, so it also arrives on demand.
   The track list is bundled in here rather than fetched: this chunk is already
   on the critical path of opening the panel, and one less request is one less
   round trip on a slow connection. */

const VOLUME_KEY = 'quiet-world-music-volume'
const TRACK_KEY = 'quiet-music-current'

// Five stepped levels (percent) for the signal-bar volume control.
const VOLUME_STEPS = [20, 40, 60, 80, 100]

const STRINGS = {
  en: {
    region: 'Music player',
    playlist: 'Playlist',
    play: 'Play',
    pause: 'Pause',
    previous: 'Previous track',
    next: 'Next track',
    volume: 'Volume',
    progress: 'Playback progress',
    loadError: 'This track failed to load',
    close: 'Close player',
  },
  zh: {
    region: '音乐播放器',
    playlist: '歌单',
    play: '播放',
    pause: '暂停',
    previous: '上一首',
    next: '下一首',
    volume: '音量',
    progress: '播放进度',
    loadError: '这首曲目加载失败',
    close: '关闭播放器',
  },
}

function strings() {
  return document.documentElement.lang.toLowerCase().startsWith('en') ? STRINGS.en : STRINGS.zh
}

const audio = new Audio()
audio.preload = 'none'

const songs = musicTracks
let index = 0
let seeking = false
let volSeeking = false
let seekPending = false
let rafId = 0
let failed = false

interface Refs {
  title: HTMLElement
  artist: HTMLElement
  cover: HTMLElement
  current: HTMLElement
  total: HTMLElement
  progress: HTMLButtonElement
  fill: HTMLElement
  play: HTMLButtonElement
  prev: HTMLButtonElement
  next: HTMLButtonElement
  volGroup: HTMLElement
  volBars: HTMLButtonElement[]
  section: HTMLElement
  playlist: HTMLOListElement
  rows: HTMLElement[]
  lyrics: HTMLElement
  lyricList: HTMLElement
}

let dialog: HTMLDialogElement | null = null
let els: Refs | null = null

function readVolume(): number {
  try {
    const saved = Number.parseFloat(localStorage.getItem(VOLUME_KEY) || '')
    if (Number.isFinite(saved)) {
      return Math.max(0, Math.min(1, saved))
    }
  }
  catch { /* private mode */ }
  return 0.7
}

function safeGet(key: string): string | null {
  try {
    return localStorage.getItem(key)
  }
  catch {
    return null
  }
}

function writeKey(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  }
  catch { /* private mode */ }
}

function isPlaying(): boolean {
  return !!audio.src && !audio.paused && !audio.ended && !failed
}

function trackDuration(): number {
  return Number.isFinite(audio.duration) ? audio.duration : 0
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return '0:00'
  }
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`
}

/* ------------------------------------------------------------------ DOM */

const ICONS = {
  // Official Phosphor Icons paths (@phosphor-icons/core 2.1.1, MIT license),
  // fetched per-icon — no icon font, no hand-drawn glyphs. All share the
  // 256x256 viewBox; sizes below set the visual hierarchy.
  close: '<svg viewBox="0 0 256 256" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M205.66,194.34a8,8,0,0,1-11.32,11.32L128,139.31,61.66,205.66a8,8,0,0,1-11.32-11.32L116.69,128,50.34,61.66A8,8,0,0,1,61.66,50.34L128,116.69l66.34-66.35a8,8,0,0,1,11.32,11.32L139.31,128Z"/></svg>',
  prev: '<svg viewBox="0 0 256 256" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M199.81,34a16,16,0,0,0-16.24.43L64,109.23V40a8,8,0,0,0-16,0V216a8,8,0,0,0,16,0V146.77l119.57,74.78A15.95,15.95,0,0,0,208,208.12V47.88A15.86,15.86,0,0,0,199.81,34ZM192,208,64.16,128,192,48.07Z"/></svg>',
  play: '<svg class="mp-icon-play" viewBox="0 0 256 256" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M240,128a15.74,15.74,0,0,1-7.6,13.51L88.32,229.65a16,16,0,0,1-16.2.3A15.86,15.86,0,0,1,64,216.13V39.87a15.86,15.86,0,0,1,8.12-13.82,16,16,0,0,1,16.2.3L232.4,114.49A15.74,15.74,0,0,1,240,128Z"/></svg>',
  pause: '<svg class="mp-icon-pause" viewBox="0 0 256 256" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M216,48V208a16,16,0,0,1-16,16H160a16,16,0,0,1-16-16V48a16,16,0,0,1,16-16h40A16,16,0,0,1,216,48ZM96,32H56A16,16,0,0,0,40,48V208a16,16,0,0,0,16,16H96a16,16,0,0,0,16-16V48A16,16,0,0,0,96,32Z"/></svg>',
  next: '<svg viewBox="0 0 256 256" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M200,32a8,8,0,0,0-8,8v69.23L72.43,34.45A15.95,15.95,0,0,0,48,47.88V208.12a16,16,0,0,0,24.43,13.43L192,146.77V216a8,8,0,0,0,16,0V40A8,8,0,0,0,200,32ZM64,207.93V48.05l127.84,80Z"/></svg>',
}

const SKELETON = `
  <div class="mp-card">
    <div class="mp-head">
      <button id="music-panel-close" class="mp-close" type="button">${ICONS.close}</button>
    </div>
    <div class="mp-body">
      <div class="mp-hero">
        <div class="mp-cover" aria-hidden="true"></div>
        <div class="mp-meta">
          <div class="mp-title"></div>
          <div class="mp-artist"></div>
        </div>
        <div class="mp-lyrics">
          <div class="mp-lyrics-list"></div>
        </div>
      </div>
      <div class="mp-times-row">
        <div class="mp-times">
          <span class="mp-current">0:00</span>
          <span class="mp-total">0:00</span>
        </div>
        <div class="mp-volume">
          <div class="mp-vol-bars" role="group">
            <button class="mp-vol-bar" type="button"></button>
            <button class="mp-vol-bar" type="button"></button>
            <button class="mp-vol-bar" type="button"></button>
            <button class="mp-vol-bar" type="button"></button>
            <button class="mp-vol-bar" type="button"></button>
          </div>
        </div>
      </div>
      <button class="mp-progress" type="button" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">
        <span class="mp-progress-fill"></span>
      </button>
      <div class="mp-buttons">
        <button class="mp-btn mp-prev" type="button">${ICONS.prev}</button>
        <button class="mp-btn mp-play" type="button">${ICONS.play}${ICONS.pause}</button>
        <button class="mp-btn mp-next" type="button">${ICONS.next}</button>
      </div>
      <div class="mp-section"></div>
      <ol class="mp-playlist"></ol>
    </div>
  </div>`

function buildDialog(): HTMLDialogElement {
  const node = document.createElement('dialog')
  node.id = 'music-panel-modal'
  node.innerHTML = SKELETON
  els = {
    title: node.querySelector('.mp-title') as HTMLElement,
    artist: node.querySelector('.mp-artist') as HTMLElement,
    cover: node.querySelector('.mp-cover') as HTMLElement,
    current: node.querySelector('.mp-current') as HTMLElement,
    total: node.querySelector('.mp-total') as HTMLElement,
    progress: node.querySelector('.mp-progress') as HTMLButtonElement,
    fill: node.querySelector('.mp-progress-fill') as HTMLElement,
    play: node.querySelector('.mp-play') as HTMLButtonElement,
    prev: node.querySelector('.mp-prev') as HTMLButtonElement,
    next: node.querySelector('.mp-next') as HTMLButtonElement,
    volGroup: node.querySelector('.mp-vol-bars') as HTMLElement,
    volBars: [...node.querySelectorAll<HTMLButtonElement>('.mp-vol-bar')],
    section: node.querySelector('.mp-section') as HTMLElement,
    playlist: node.querySelector('.mp-playlist') as HTMLOListElement,
    lyrics: node.querySelector('.mp-lyrics') as HTMLElement,
    lyricList: node.querySelector('.mp-lyrics-list') as HTMLElement,
    rows: [],
  }
  bindDialog(node)
  return node
}

// Localized static strings; also re-applied after SPA navigation so the
// dialog follows the language of the page the user landed on.
function relabel() {
  if (!dialog || !els) {
    return
  }
  const s = strings()
  dialog.setAttribute('aria-label', s.region)
  const closeBtn = dialog.querySelector('#music-panel-close')
  closeBtn?.setAttribute('aria-label', s.close)
  els.progress.setAttribute('aria-label', s.progress)
  els.volGroup.setAttribute('aria-label', s.volume)
  els.volBars.forEach((bar, i) => {
    bar.setAttribute('aria-label', `${s.volume} ${VOLUME_STEPS[i]}%`)
  })
  els.prev.setAttribute('aria-label', s.previous)
  els.next.setAttribute('aria-label', s.next)
  els.section.textContent = s.playlist
}

function showLetterTile(container: HTMLElement, song: Song) {
  container.textContent = ''
  const span = document.createElement('span')
  span.className = 'mp-cover-char'
  span.textContent = (song.title || '').trim().charAt(0) || '♪'
  container.append(span)
}

function setCover(container: HTMLElement, song: Song, size: number, eager: boolean) {
  container.textContent = ''
  if (song.cover) {
    const img = document.createElement('img')
    img.src = song.cover
    img.alt = ''
    img.width = size
    img.height = size
    img.loading = eager ? 'eager' : 'lazy'
    img.decoding = 'async'
    // A dead CDN must degrade to the same letter tile as a missing cover, not
    // leave a broken image. The parent check avoids overwriting a newer cover
    // when a lazy row was recycled while this request was still in flight.
    img.addEventListener('error', () => {
      if (img.parentElement === container)
        showLetterTile(container, song)
    }, { once: true })
    container.append(img)
    return
  }
  showLetterTile(container, song)
}

/* --------------------------------------------------------------- lyrics */

interface LyricLine {
  time: number
  text: string
}

// Lyrics are a separate, optional asset: one small LRC fetch per track, kept in
// memory so reopening the panel never re-requests it.
const lyricCache = new Map<string, LyricLine[]>()
let lyricLines: LyricLine[] = []
let lyricIdx = -1
let lyricToken = 0
// While the visitor drags or wheels the column, the player stops steering it:
// lyricOffset carries the manual displacement on top of the auto-centring
// position, and control glides back after a few idle seconds.
let lyricOffset = 0
let lyricAutoY = 0
let lyricIdle: ReturnType<typeof setTimeout> | null = null

const lrcFetches = new Map<string, Promise<string | null>>()

/** Memoised so the hover warm-up and the click path share one request per LRC. */
function fetchLrc(url: string): Promise<string | null> {
  let pending = lrcFetches.get(url)
  if (!pending) {
    pending = fetch(url).then(res => (res.ok ? res.text() : null)).catch(() => null)
    lrcFetches.set(url, pending)
  }
  return pending
}

function parseLrc(raw: string): LyricLine[] {
  const lines: LyricLine[] = []
  for (const row of raw.split(/\r?\n/)) {
    const stamps = [...row.matchAll(/\[(\d{1,2}):(\d{1,2}(?:[.:]\d{1,3})?)\]/g)]
    if (stamps.length === 0) {
      continue
    }
    // Metadata tags ([ti:..], [by:..]) never match above, and a line that is
    // only tags blanks out here instead of rendering an empty row.
    const text = row.replace(/\[[^\]]*\]/g, '').trim()
    if (!text) {
      continue
    }
    for (const [, mm, rest] of stamps) {
      const [sec, frac = ''] = rest.split(/[.:]/)
      lines.push({
        time: Number(mm) * 60 + Number(sec) + Number(frac.padEnd(3, '0')) / 1000,
        text,
      })
    }
  }
  return lines.sort((a, b) => a.time - b.time)
}

function applyLyricPos(snap: boolean) {
  if (!els) {
    return
  }
  if (snap) {
    els.lyricList.style.transition = 'none'
  }
  els.lyricList.style.transform = `translateY(${lyricAutoY + lyricOffset}px)`
  if (snap) {
    void els.lyricList.offsetHeight
    els.lyricList.style.transition = ''
  }
}

// The drag may not go past the positions the player itself would auto-centre
// to: the first line's centred spot is the lowest, the last line's the highest.
// Using those two keeps manual and automatic placement on one continuous scale.
function clampLyricY(y: number): number {
  if (!els) {
    return 0
  }
  const nodes = els.lyricList.children
  if (nodes.length === 0) {
    return 0
  }
  const box = els.lyrics.getBoundingClientRect().height
  const first = nodes[0] as HTMLElement
  const last = nodes[nodes.length - 1] as HTMLElement
  const low = box / 2 - (last.offsetTop + last.offsetHeight / 2)
  const high = box / 2 - (first.offsetTop + first.offsetHeight / 2)
  return Math.max(low, Math.min(high, y))
}

function lyricIdleHandback() {
  if (lyricIdle) {
    clearTimeout(lyricIdle)
  }
  lyricIdle = setTimeout(() => {
    lyricIdle = null
    lyricOffset = 0
    applyLyricPos(false)
  }, 2500)
}

function seekToLine(i: number) {
  const song = songs[index]
  const line = lyricLines[i]
  if (!els || !song || !line) {
    return
  }
  if (!audio.src) {
    audio.src = song.src
    audio.load()
  }
  failed = false
  audio.currentTime = line.time
  if (lyricIdle) {
    clearTimeout(lyricIdle)
    lyricIdle = null
  }
  lyricOffset = 0
  lyricIdx = -1
  syncLyrics(line.time)
  playCurrent()
  syncAll()
}

function lyricIndexOf(node: Element | null): number {
  return node && els ? [...els.lyricList.children].indexOf(node) : -1
}

function bindLyricScroll() {
  const box = els!.lyrics
  let downY = 0
  let startOffset = 0
  let dragging = false
  let dragged = false
  let downLine: Element | null = null

  box.addEventListener('pointerdown', (event) => {
    if (lyricLines.length === 0) {
      return
    }
    dragging = true
    dragged = false
    downY = event.clientY
    startOffset = lyricOffset
    downLine = (event.target as HTMLElement | null)?.closest('.mp-lyric-line') ?? null
    if (lyricIdle) {
      clearTimeout(lyricIdle)
      lyricIdle = null
    }
    event.preventDefault()
    box.setPointerCapture?.(event.pointerId)
  })
  box.addEventListener('pointermove', (event) => {
    if (!dragging) {
      return
    }
    if (Math.abs(event.clientY - downY) > 4) {
      dragged = true
    }
    lyricOffset = clampLyricY(lyricAutoY + startOffset + (event.clientY - downY)) - lyricAutoY
    applyLyricPos(true)
    event.preventDefault()
  })
  const finish = (event: PointerEvent) => {
    if (!dragging) {
      return
    }
    dragging = false
    // A tap seeks here rather than in 'click': setPointerCapture retargets
    // pointerup and the click that follows to this box, which loses the line
    // under the finger. The pointerdown target still names it.
    if (!dragged) {
      const i = lyricIndexOf(downLine)
      if (i >= 0) {
        seekToLine(i)
      }
    }
    downLine = null
    lyricIdleHandback()
    box.releasePointerCapture?.(event.pointerId)
  }
  box.addEventListener('pointerup', finish)
  box.addEventListener('pointercancel', finish)
  // Keyboard activation only (detail 0); pointer taps were handled on pointerup.
  box.addEventListener('click', (event) => {
    if (event.detail !== 0) {
      return
    }
    const i = lyricIndexOf(
      (event.target as HTMLElement | null)?.closest('.mp-lyric-line') ?? null,
    )
    if (i >= 0) {
      seekToLine(i)
    }
  })
  box.addEventListener('wheel', (event) => {
    if (lyricLines.length === 0) {
      return
    }
    event.preventDefault()
    lyricOffset = clampLyricY(lyricAutoY + lyricOffset - event.deltaY) - lyricAutoY
    applyLyricPos(true)
    lyricIdleHandback()
  }, { passive: false })
}

// snap=true skips the slide transition: used right after a (re)paint, while the
// progress bar is dragged, and during a manual lyric drag, where animating would
// lag the finger.
function syncLyrics(at: number, snap = false) {
  if (!els || lyricLines.length === 0) {
    return
  }
  let next = lyricIdx
  if (next < 0 || lyricLines[next].time > at) {
    next = -1
  }
  while (next + 1 < lyricLines.length && lyricLines[next + 1].time <= at + 0.05) {
    next += 1
  }
  if (next === lyricIdx && !snap) {
    return
  }
  lyricIdx = next
  const nodes = [...els.lyricList.children] as HTMLElement[]
  nodes.forEach((node, i) => node.classList.toggle('is-active', i === lyricIdx))
  const active = nodes[lyricIdx]
  const prevAutoY = lyricAutoY
  lyricAutoY = active
    ? els.lyrics.getBoundingClientRect().height / 2 - (active.offsetTop + active.offsetHeight / 2)
    : 0
  if (lyricOffset !== 0) {
    // Browsing an earlier verse: retarget silently so the line change doesn't
    // shove the column the moment the song moves on.
    lyricOffset += prevAutoY - lyricAutoY
  }
  applyLyricPos(snap)
}

function paintLyrics() {
  if (!els || !dialog) {
    return
  }
  els.lyricList.textContent = ''
  for (const line of lyricLines) {
    const node = document.createElement('button')
    node.type = 'button'
    node.className = 'mp-lyric-line'
    node.textContent = line.text
    node.setAttribute('aria-label', `${formatTime(line.time)} ${line.text}`)
    els.lyricList.append(node)
  }
  dialog.classList.toggle('mp-has-lyrics', lyricLines.length > 0)
  lyricIdx = -1
  lyricOffset = 0
  lyricAutoY = 0
  if (lyricIdle) {
    clearTimeout(lyricIdle)
    lyricIdle = null
  }
  // Right after changeTrack the element still reports the previous track's
  // currentTime, so only a loaded duration makes that position trustworthy.
  syncLyrics(Number.isFinite(audio.duration) ? audio.currentTime || 0 : 0, true)
}

async function ensureLyrics(song: Song) {
  const token = ++lyricToken
  lyricLines = lyricCache.get(song.id) ?? []
  paintLyrics()
  if (lyricLines.length > 0 || !song.lyrics) {
    return
  }
  const raw = await fetchLrc(song.lyrics)
  if (raw === null || token !== lyricToken) {
    return
  }
  lyricLines = parseLrc(raw)
  lyricCache.set(song.id, lyricLines)
  paintLyrics()
}

function renderPlaylist() {
  if (!els) {
    return
  }
  els.playlist.textContent = ''
  const rows: HTMLElement[] = []
  songs.forEach((song, i) => {
    const li = document.createElement('li')
    const row = document.createElement('button')
    row.className = 'mp-row'
    row.type = 'button'

    const idx = document.createElement('span')
    idx.className = 'mp-row-index'
    idx.innerHTML = '<span class="mp-row-num"></span><span class="mp-row-eq" aria-hidden="true"><span></span><span></span><span></span></span>'
    idx.firstElementChild!.textContent = String(i + 1)

    const art = document.createElement('span')
    art.className = 'mp-row-art'
    art.setAttribute('aria-hidden', 'true')
    setCover(art, song, 32, false)

    const main = document.createElement('span')
    main.className = 'mp-row-main'
    const title = document.createElement('span')
    title.className = 'mp-row-title'
    title.textContent = song.title
    const artist = document.createElement('span')
    artist.className = 'mp-row-artist'
    artist.textContent = song.artist
    main.append(title, artist)

    row.append(idx, art, main)
    row.addEventListener('click', () => {
      if (i === index && !failed) {
        togglePlay()
        return
      }
      changeTrack(i, true)
    })
    li.append(row)
    els!.playlist.append(li)
    rows.push(row)
  })
  els.rows = rows
}

/* ------------------------------------------------------------- UI syncs */

function isOpen(): boolean {
  return !!dialog?.open
}

function updatePlayingClass() {
  document.documentElement.classList.toggle('music-playing', isPlaying())
}

function syncProgressUI() {
  // While dragging (or until a committed seek lands), the pointer owns the
  // fill; reading audio.currentTime here would snap it back and cause jitter.
  if (!els || !isOpen() || seeking || seekPending) {
    return
  }
  const duration = trackDuration()
  const current = audio.currentTime || 0
  const progress = duration > 0 ? Math.min(1, current / duration) : 0
  els.current.textContent = failed ? strings().loadError : formatTime(current)
  els.total.textContent = formatTime(duration)
  els.fill.style.transform = `scaleX(${progress})`
  els.progress.setAttribute('aria-valuenow', String(Math.round(progress * 100)))
  els.progress.setAttribute('aria-valuetext', `${formatTime(current)} / ${formatTime(duration)}`)
  if (duration > 0) {
    syncLyrics(current)
  }
}

// timeupdate only fires a few times per second; a rAF loop keeps the fill
// moving every frame while playing (and idles to zero cost when paused).
function startTicker() {
  if (rafId) {
    return
  }
  rafId = requestAnimationFrame(() => {
    rafId = 0
    if (!isPlaying()) {
      return
    }
    syncProgressUI()
    startTicker()
  })
}

function renderNowPlaying() {
  const song = songs[index]
  if (!els || !song) {
    return
  }
  els.title.textContent = song.title
  els.artist.textContent = song.artist
  setCover(els.cover, song, 74, true)
  ensureLyrics(song)
}

function syncAll() {
  if (!dialog || !els) {
    return
  }
  const playing = isPlaying()
  const s = strings()
  dialog.classList.toggle('mp-playing', playing)
  dialog.classList.toggle('mp-error', failed)
  els.play.setAttribute('aria-label', playing ? s.pause : s.play)
  const lvl = volumeLevel()
  els.volBars.forEach((bar, i) => {
    const active = i < lvl
    bar.classList.toggle('is-active', active)
    bar.setAttribute('aria-pressed', String(active))
  })
  els.rows.forEach((row, i) => {
    row.classList.toggle('is-active', i === index)
    row.classList.toggle('is-playing-row', i === index && playing)
  })
  syncProgressUI()
}

function syncToggleButton() {
  const btn = document.getElementById('music-toggle')
  if (!btn) {
    return
  }
  if (!btn.dataset.originalLabel) {
    btn.dataset.originalLabel = btn.getAttribute('aria-label') || ''
  }
  btn.setAttribute('aria-expanded', String(isOpen()))
  btn.setAttribute('aria-label', isOpen() ? strings().close : btn.dataset.originalLabel)
}

/* ------------------------------------------------------------ transport */

function nextIndex(): number {
  return (index + 1) % songs.length
}

function playCurrent() {
  audio.play().catch(() => {
    failed = true
    updatePlayingClass()
    syncAll()
  })
}

function changeTrack(next: number, autoplay: boolean) {
  if (songs.length === 0) {
    return
  }
  index = ((next % songs.length) + songs.length) % songs.length
  failed = false
  audio.src = songs[index].src
  audio.load()
  // load() does not reliably drop the previous track's position before the new
  // media is playable, so name the start explicitly.
  audio.currentTime = 0
  writeKey(TRACK_KEY, songs[index].id)
  renderNowPlaying()
  if (autoplay) {
    playCurrent()
  }
  syncAll()
}

function togglePlay() {
  if (!audio.src || failed) {
    changeTrack(index, true)
    return
  }
  if (audio.paused) {
    playCurrent()
  }
  else {
    audio.pause()
  }
}

// Continuous volume -> number of lit bars (0..5), rounded to the nearest step;
// any audible volume lights at least one bar.
function volumeLevel(): number {
  if (audio.volume <= 0.001) {
    return 0
  }
  return Math.max(1, Math.min(5, Math.round(audio.volume * 5)))
}

function setVolume(next: number) {
  audio.volume = Math.max(0, Math.min(1, next))
  writeKey(VOLUME_KEY, String(audio.volume))
  syncAll()
}

function seekFromClientX(clientX: number, commit: boolean) {
  const duration = trackDuration()
  if (!els || duration <= 0) {
    return
  }
  const rect = els.progress.getBoundingClientRect()
  const percent = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
  const current = percent * duration
  els.current.textContent = formatTime(current)
  els.total.textContent = formatTime(duration)
  els.fill.style.transform = `scaleX(${percent})`
  els.progress.setAttribute('aria-valuenow', String(Math.round(percent * 100)))
  els.progress.setAttribute('aria-valuetext', `${formatTime(current)} / ${formatTime(duration)}`)
  syncLyrics(current, true)
  if (commit) {
    seekPending = true
    audio.currentTime = current
  }
}

function volumeFromClientX(clientX: number) {
  if (!els) {
    return
  }
  const rect = els.volGroup.getBoundingClientRect()
  const percent = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
  setVolume(percent)
}

/* --------------------------------------------------------------- wiring */

function bindDialog(node: HTMLDialogElement) {
  node.addEventListener('click', (event) => {
    // The dialog box fills the viewport, so a click on itself is a backdrop click.
    if (event.target === node) {
      node.close()
    }
  })
  node.addEventListener('close', syncToggleButton)
  node.querySelector('#music-panel-close')!.addEventListener('click', () => node.close())

  // The lyric window is viewport-sized, so a URL-bar collapse moves its centre
  // out from under the active line; snap it back on resize.
  addEventListener('resize', () => {
    if (isOpen()) {
      syncLyrics(audio.currentTime || 0, true)
    }
  }, { passive: true })

  const r = els!
  r.play.addEventListener('click', togglePlay)
  r.prev.addEventListener('click', () => changeTrack(index - 1, true))
  r.next.addEventListener('click', () => changeTrack(nextIndex(), true))

  const bindSlider = (
    el: HTMLElement,
    getFlag: () => boolean,
    setFlag: (v: boolean) => void,
    fromX: (x: number) => void,
  ) => {
    el.addEventListener('click', (event) => {
      if (!getFlag()) {
        fromX(event.clientX)
      }
    })
    el.addEventListener('pointerdown', (event) => {
      setFlag(true)
      fromX(event.clientX)
      event.preventDefault()
      // After the value is applied: an invalid pointerId would otherwise throw
      // here and swallow the assignment (same ordering rule as the volume group).
      el.setPointerCapture?.(event.pointerId)
    })
    el.addEventListener('pointermove', (event) => {
      if (getFlag()) {
        fromX(event.clientX)
        event.preventDefault()
      }
    })
    const finish = (event: PointerEvent) => {
      if (!getFlag()) {
        return
      }
      setFlag(false)
      fromX(event.clientX)
      el.releasePointerCapture?.(event.pointerId)
      syncAll()
    }
    el.addEventListener('pointerup', finish)
    el.addEventListener('pointercancel', finish)
  }
  // The seeking flag gates pointermove so a plain hover across the progress
  // bar never seeks, and lets the fill follow the finger during a drag.
  const setSeeking = (v: boolean) => {
    seeking = v
  }
  bindSlider(r.progress, () => seeking, setSeeking, (x) => {
    if (isOpen()) {
      seekFromClientX(x, !seeking)
    }
  })

  // Volume group owns all pointer input (bars are pointer-events:none): a tap
  // snaps to the nearest bar's level, a drag sets volume continuously so
  // sliding to/past the left edge reaches mute. Keyboard stays on the bars.
  let volDownX = 0
  let volDragged = false
  const volSnapFromX = (x: number) => {
    const rect = r.volGroup.getBoundingClientRect()
    const idx = Math.round(((x - rect.left) / rect.width) * 5 - 0.5)
    setVolume(idx < 0 ? 0 : VOLUME_STEPS[Math.min(4, idx)] / 100)
  }
  r.volGroup.addEventListener('pointerdown', (event) => {
    volSeeking = true
    volDragged = false
    volDownX = event.clientX
    event.preventDefault()
    r.volGroup.setPointerCapture?.(event.pointerId)
  })
  r.volGroup.addEventListener('pointermove', (event) => {
    if (!volSeeking) {
      return
    }
    if (Math.abs(event.clientX - volDownX) > 4) {
      volDragged = true
    }
    if (volDragged) {
      volumeFromClientX(event.clientX)
    }
    event.preventDefault()
  })
  const volFinish = (event: PointerEvent) => {
    if (!volSeeking) {
      return
    }
    volSeeking = false
    if (volDragged) {
      volumeFromClientX(event.clientX)
    }
    else {
      volSnapFromX(event.clientX)
    }
    r.volGroup.releasePointerCapture?.(event.pointerId)
  }
  r.volGroup.addEventListener('pointerup', volFinish)
  r.volGroup.addEventListener('pointercancel', volFinish)

  r.volBars.forEach((bar, i) => {
    // Keyboard activation only (detail === 0); pointer taps are handled above.
    bar.addEventListener('click', (event) => {
      if (event.detail === 0) {
        setVolume(VOLUME_STEPS[i] / 100)
      }
    })
  })
  r.volGroup.addEventListener('keydown', (event) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') {
      return
    }
    event.preventDefault()
    const step = event.key === 'ArrowRight' ? 1 : -1
    setVolume(Math.max(0, Math.min(5, volumeLevel() + step)) / 5)
  })

  bindLyricScroll()
}

function bindAudio() {
  audio.volume = readVolume()
  audio.addEventListener('play', () => {
    failed = false
    updatePlayingClass()
    syncAll()
    startTicker()
  })
  audio.addEventListener('pause', () => {
    updatePlayingClass()
    syncAll()
  })
  audio.addEventListener('ended', () => {
    changeTrack(nextIndex(), true)
  })
  audio.addEventListener('timeupdate', syncProgressUI)
  audio.addEventListener('loadedmetadata', syncProgressUI)
  audio.addEventListener('seeked', () => {
    seekPending = false
    syncProgressUI()
  })
  audio.addEventListener('error', () => {
    failed = true
    updatePlayingClass()
    syncAll()
  })
}

/* ------------------------------------------------------------ lifecycle */

function injectCss() {
  if (!document.getElementById('music-player-css')) {
    const link = document.createElement('link')
    link.id = 'music-player-css'
    link.rel = 'stylesheet'
    link.href = cssUrl
    document.head.append(link)
  }
}

/**
 * Warms everything the first click needs. Called from the launcher on
 * pointerenter, so a mouse user's click finds the chunk, the stylesheet and the
 * resumed track's lyric already in flight or settled.
 */
export function preload() {
  injectCss()
  const saved = musicTracks.findIndex(song => song.id === safeGet(TRACK_KEY))
  const url = musicTracks[saved > 0 ? saved : 0]?.lyrics
  if (url) {
    void fetchLrc(url)
  }
}

function mount(): boolean {
  injectCss()
  if (songs.length === 0) {
    return false
  }
  const saved = songs.findIndex(song => song.id === safeGet(TRACK_KEY))
  if (saved > 0) {
    index = saved
  }
  bindAudio()
  dialog = buildDialog()
  renderPlaylist()
  document.body.append(dialog)
  return true
}

function ensureMounted(): boolean {
  return dialog !== null || mount()
}

export function toggleMusicPanel() {
  if (!ensureMounted() || !dialog) {
    return
  }
  // ClientRouter swaps also replace <head> — re-inject the stylesheet if gone.
  injectCss()
  if (dialog.open) {
    dialog.close()
    return
  }
  // ClientRouter swaps wipe body children — re-attach the surviving dialog.
  if (!dialog.isConnected) {
    document.body.append(dialog)
  }
  relabel()
  // showModal first: the lyric scroller measures its own box to centre the
  // active line, and a closed dialog reports height 0 (display:none).
  dialog.showModal()
  renderNowPlaying()
  syncAll()
  syncToggleButton()
}

// Survivors of full-body replacement: dialog node, toggle aria state, and the
// html.music-playing class all need a per-navigation re-sync.
document.addEventListener('astro:page-load', () => {
  if (!dialog) {
    return
  }
  injectCss()
  if (!dialog.isConnected) {
    document.body.append(dialog)
  }
  relabel()
  updatePlayingClass()
  syncToggleButton()
  syncAll()
})
