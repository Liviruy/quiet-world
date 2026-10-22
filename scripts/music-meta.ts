/**
 * 自动匹配专辑信息 / 封面，供音乐播放器读取。
 *
 * 优先级：Apple iTunes Search -> MusicBrainz + Cover Art Archive -> 人工兜底。
 * 结果写入 src/data/music-metadata.json，它既是缓存也是前端数据源，播放器
 * 通过 src/data/music.ts 合并进 songs.json，运行时不再调用任何第三方 API。
 *
 * 用法：
 *   pnpm music-meta                      处理 src/config/music.ts 中所有未匹配成功的曲目
 *   pnpm music-meta --force              忽略缓存，全部重新查询
 *   pnpm music-meta --song 晴天 周杰伦   只查一首，结果打印到控制台，不写盘
 *   pnpm music-meta --accept <id>        把该曲目 review 的首选候选提升为 matched
 *   pnpm music-meta --list-review        列出所有等待人工确认的曲目
 *
 * 版权提示：第三方封面图片的版权/使用许可需要根据来源和具体用途确认，
 * 不要默认认为 API 返回的图片可以任意再分发。
 */

import { readFile, writeFile } from 'node:fs/promises'
import process from 'node:process'
import { musicConfig } from '../src/config/music'

type MatchStatus = 'matched' | 'review' | 'not_found'
type Source = 'itunes' | 'musicbrainz'

interface Candidate {
  title: string
  artist: string
  album: string
  cover: string | null
  trackId: string | null
  collectionId: string | null
  source: Source
  storefronts: string[]
  score: number
  titleExact: boolean
  titleVariant: boolean
  artistExact: boolean
  topHit: boolean
}

interface TrackMeta {
  title: string
  artist: string
  album: string | null
  cover: string | null
  trackId: string | null
  collectionId: string | null
  matchStatus: MatchStatus
  source: Source | null
  queriedAt: string
  candidates?: Candidate[]
}

interface MetadataFile {
  version: 1
  tracks: Record<string, TrackMeta>
}

interface ItunesResult {
  trackName?: string
  artistName?: string
  collectionName?: string
  artworkUrl100?: string
  trackId?: number
  collectionId?: number
}

interface MbRecording {
  'id': string
  'title'?: string
  'score'?: number
  'artist-credit'?: { name: string }[]
  'releases'?: { id: string, title?: string }[]
}

const METADATA_PATH = 'src/data/music-metadata.json'
const ITUNES_URL = 'https://itunes.apple.com/search'
const MB_URL = 'https://musicbrainz.org/ws/2'
const CAA_URL = 'https://coverartarchive.org/release'
/**
 * 国区（CN）搜索接口对多数曲目返回 0 条，美区会返回同名翻弹版本，
 * 因此以繁中曲库为主、港区做交叉验证。
 */
const STOREFRONTS = ['tw', 'hk']
const TIMEOUT_MS = 15_000
const ITUNES_DELAY_MS = 500
const MB_DELAY_MS = 1200
const RETRIES = 2
/** MusicBrainz 要求带可识别联系方式的 User-Agent，否则会被限流。 */
const USER_AGENT = 'astro-blog-music-match/1.0 (personal blog https://artist.cc.cd)'

/** 版本标记：输入没写而结果里出现，说明是 Live/Remix/伴奏等另一个版本。 */
const VERSION_MARKERS = /live|remix|acoustic|instrumental|karaoke|cover|dj|demo|rehearsal|concert|unplugged|现场|演唱会|翻唱|伴奏|纯音乐|试唱|哼唱版/
/** 精选集/合辑的封面不是原专辑封面，命中则降级。 */
const COMPILATION_MARKERS = /best|greatest|compilation|collection|精选|合辑|金曲|原声带|ost|soundtrack/

/**
 * 合作曲的署名（"街道办GDC / 欧阳耀莹"）既会把搜索词带歪，也会让歌手名长度
 * 对不上而全部落空，所以一律取首位署名歌手来搜索和比对。
 */
function primaryArtist(value: string): string {
  const credited = value.replace(/\s+(?:feat|ft)\.?\s+/i, ' / ')
  const first = credited.split(/[/、，,&＆]+/)[0]
  return first?.trim() || value.trim()
}

function normalize(value: string): string {
  return value
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\s'"`·•．,，、!！?？:：;；(){}[\]【】_/\\+&’‘“”（）-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function hasMarker(value: string, pattern: RegExp): boolean {
  return pattern.test(normalize(value))
}

function compact(value: string): string {
  return normalize(value).replace(/\s/g, '')
}

function sharedChars(a: string, b: string): number {
  const charsB = [...b]
  return [...a].filter(char => charsB.includes(char)).length
}

/**
 * 繁简/异体无法靠字符串相等判定（周杰伦 vs 周杰倫、春娇与志明 vs 春嬌與志明）。
 * 歌手是区分同名翻唱的唯一屏障，所以要求更严：等长且共享过半字符。
 */
function isArtistVariant(input: string, found: string): boolean {
  const a = compact(input)
  const b = compact(found)
  if (a.length === 0 || a.length !== b.length) {
    return false
  }
  const shared = sharedChars(a, b)
  return shared >= Math.ceil(a.length / 2) || (a.length <= 4 && shared >= 1)
}

/** 标题：查询本身就带着歌名，等长且有共同字符即可视为同一曲名的另一种写法。 */
function isTitleVariant(input: string, found: string): boolean {
  const a = compact(input)
  const b = compact(found)
  return a.length > 0 && a.length === b.length && sharedChars(a, b) >= 1
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function fetchJson<T>(url: string, headers: Record<string, string> = {}): Promise<T | null> {
  for (let attempt = 0; attempt <= RETRIES; attempt++) {
    try {
      const res = await fetch(url, { headers, signal: AbortSignal.timeout(TIMEOUT_MS) })
      if (res.status === 429 || res.status >= 500) {
        throw new Error(`HTTP ${res.status}`)
      }
      if (!res.ok) {
        return null
      }
      return await res.json() as T
    }
    catch (error) {
      if (attempt === RETRIES) {
        console.warn(`  ! 请求失败：${url.slice(0, 60)}… (${String(error).slice(0, 40)})`)
        return null
      }
      await sleep(500 * 2 ** attempt)
    }
  }
  return null
}

/** 封面必须是可访问的：播放器只在 cover 为空时才退回字母砖，写坏地址等于自找破图。 */
async function isReachable(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(TIMEOUT_MS) })
    return res.ok
  }
  catch {
    return false
  }
}

/**
 * 封面在面板里最大只画到 74px（歌单行 46px），3 倍屏也只要 222px。
 * 实测同一张图：100x100bb 3.0KB / 200x200bb 7.1KB / 300x300bb 14.7KB /
 * 600x600bb 82KB —— 取 300 既够锐利，又不让首次开面板多背 65KB。
 */
const ARTWORK_SIZE = '300x300bb'

function upgradeArtwork(url: string): string {
  return url.replace(/\/\d+x\d+bb\./, `/${ARTWORK_SIZE}.`)
}

function scoreCandidate(
  title: string,
  artist: string,
  found: { title: string, artist: string, album: string, cover: string | null, trackId: string | null, collectionId: string | null },
  source: Source,
  storefront: string,
  rank: number,
): Candidate | null {
  const wantedHasVersion = hasMarker(title, VERSION_MARKERS)
  // 原版查询撞上 Live/Remix 等版本，直接丢弃，不进入任何候选
  if (!wantedHasVersion && hasMarker(found.title, VERSION_MARKERS)) {
    return null
  }
  const titleExact = normalize(title) === normalize(found.title)
  const titleVariant = !titleExact && isTitleVariant(title, found.title)
  // 仅"输入是它的前缀"说明结果多了个版本后缀（如 戒不掉 (原聲版)），只能进 review
  const titleSuffixed = !titleExact && !titleVariant && normalize(found.title).startsWith(normalize(title))
  if (!titleExact && !titleVariant && !titleSuffixed) {
    return null
  }
  const artistExact = normalize(primaryArtist(artist)) === normalize(primaryArtist(found.artist))
  if (!artistExact && !isArtistVariant(primaryArtist(artist), primaryArtist(found.artist))) {
    return null
  }

  let score = titleExact ? 6 : titleVariant ? 4 : 2
  score += artistExact ? 4 : 2
  if (found.cover) {
    score += 1
  }
  if (rank === 0) {
    score += 2
  }
  if (hasMarker(found.album, COMPILATION_MARKERS)) {
    score -= 2
  }
  return {
    title: found.title,
    artist: found.artist,
    album: found.album,
    cover: found.cover,
    trackId: found.trackId,
    collectionId: found.collectionId,
    source,
    storefronts: [storefront],
    score,
    titleExact,
    titleVariant,
    artistExact,
    topHit: rank === 0,
  }
}

async function searchItunes(title: string, artist: string): Promise<Candidate[]> {
  const pool = new Map<string, Candidate>()
  for (const storefront of STOREFRONTS) {
    const term = encodeURIComponent(`${title} ${primaryArtist(artist)}`)
    const data = await fetchJson<{ results?: ItunesResult[] }>(
      `${ITUNES_URL}?entity=song&limit=12&country=${storefront}&term=${term}`,
    )
    await sleep(ITUNES_DELAY_MS)
    for (const [rank, item] of (data?.results ?? []).entries()) {
      if (!item.trackName || !item.artistName) {
        continue
      }
      const candidate = scoreCandidate(title, artist, {
        title: item.trackName,
        artist: item.artistName,
        album: item.collectionName ?? '',
        cover: item.artworkUrl100 ? upgradeArtwork(item.artworkUrl100) : null,
        trackId: item.trackId == null ? null : String(item.trackId),
        collectionId: item.collectionId == null ? null : String(item.collectionId),
      }, 'itunes', storefront, rank)
      if (!candidate) {
        continue
      }
      const key = `${candidate.source}:${candidate.trackId ?? candidate.title}`
      const existing = pool.get(key)
      if (!existing) {
        pool.set(key, candidate)
      }
      else {
        existing.score += 1 // 多曲店同时命中，视为互相印证
        existing.topHit ||= candidate.topHit
        if (!existing.storefronts.includes(storefront)) {
          existing.storefronts.push(storefront)
        }
      }
    }
  }
  return [...pool.values()].sort((a, b) => b.score - a.score)
}

async function searchMusicBrainz(title: string, artist: string): Promise<Candidate[]> {
  // MusicBrainz 的带引号字段查询对中文曲名经常直接返回 0 条，用裸词查询才有排名结果
  const query = encodeURIComponent(`recording:${title} artist:${primaryArtist(artist)}`)
  const data = await fetchJson<{ recordings?: MbRecording[] }>(
    `${MB_URL}/recording/?query=${query}&inc=releases&limit=6&fmt=json`,
    { 'User-Agent': USER_AGENT },
  )
  await sleep(MB_DELAY_MS)
  const out: Candidate[] = []
  for (const [rank, recording] of (data?.recordings ?? []).entries()) {
    const foundArtist = (recording['artist-credit'] ?? []).map(item => item.name).join(' / ')
    const release = (recording.releases ?? []).find(item => item.title)
    const candidate = scoreCandidate(title, artist, {
      title: recording.title ?? '',
      artist: foundArtist,
      album: release?.title ?? '',
      cover: null,
      trackId: recording.id,
      collectionId: release?.id ?? null,
    }, 'musicbrainz', 'mb', rank)
    if (!candidate) {
      continue
    }
    if (release) {
      const front = `${CAA_URL}/${release.id}/front-500`
      if (await isReachable(front)) {
        candidate.cover = front
        candidate.score += 1
      }
    }
    out.push(candidate)
  }
  return out.sort((a, b) => b.score - a.score)
}

function decide(title: string, artist: string, candidates: Candidate[]): TrackMeta {
  const base = { title, artist, queriedAt: new Date().toISOString() }
  const brief = candidates.slice(0, 3)
  const best = candidates[0]
  const runnerUp = candidates[1]

  if (!best) {
    return { ...base, album: null, cover: null, trackId: null, collectionId: null, matchStatus: 'not_found', source: null }
  }

  const corroborated = best.storefronts.length >= 2
  const unambiguous = !runnerUp || runnerUp.score < best.score
  /**
   * 自动写封面需要同时满足：标题不是"多后缀的另一个版本"、有封面、
   * 是该查询在曲店的首位、没有并列候选，且（歌手歌名全等 或 多曲店互相印证）。
   * 只靠"差一点"的结果一律留在 review，交给人工 --accept。
   */
  const confident = (best.titleExact || best.titleVariant)
    && Boolean(best.cover)
    && best.topHit
    && unambiguous
    && ((best.titleExact && best.artistExact) || corroborated)
    && !hasMarker(best.album, COMPILATION_MARKERS)

  if (confident) {
    return {
      ...base,
      album: best.album || null,
      cover: best.cover,
      trackId: best.trackId,
      collectionId: best.collectionId,
      matchStatus: 'matched',
      source: best.source,
    }
  }
  return {
    ...base,
    album: best.album || null,
    cover: null,
    trackId: best.trackId,
    collectionId: best.collectionId,
    matchStatus: 'review',
    source: best.source,
    candidates: brief,
  }
}

async function loadMetadata(): Promise<MetadataFile> {
  try {
    const raw = await readFile(METADATA_PATH, 'utf8')
    const parsed = JSON.parse(raw) as MetadataFile
    if (parsed && typeof parsed === 'object' && parsed.tracks) {
      return parsed
    }
  }
  catch { /* first run */ }
  return { version: 1, tracks: {} }
}

async function saveMetadata(data: MetadataFile): Promise<void> {
  const sorted = Object.fromEntries(Object.entries(data.tracks).sort(([a], [b]) => a.localeCompare(b)))
  await writeFile(METADATA_PATH, `${JSON.stringify({ ...data, tracks: sorted }, null, 2)}\n`, 'utf8')
}

function parseTitleArtist(name: string): { title: string, artist: string } | null {
  const cleaned = name.replace(/\.[a-z0-9]+$/i, '').trim()
  const parts = cleaned.split(/\s+[-–—]\s+/)
  if (parts.length !== 2) {
    return null
  }
  return { title: parts[0].trim(), artist: parts[1].trim() }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  const force = args.includes('--force')
  const dryRun = args.includes('--dry-run')
  const songIndex = args.indexOf('--song')
  const acceptIndex = args.indexOf('--accept')

  if (args.includes('--list-review')) {
    const data = await loadMetadata()
    const pending = Object.entries(data.tracks).filter(([, meta]) => meta.matchStatus !== 'matched')
    if (pending.length === 0) {
      console.log('没有等待确认的曲目。')
    }
    for (const [id, meta] of pending) {
      console.log(`\n[${id}] ${meta.title} - ${meta.artist}  (${meta.matchStatus})`)
      for (const candidate of meta.candidates ?? []) {
        console.log(`   候选 ${candidate.score}分：${candidate.title} / ${candidate.artist} / ${candidate.album}`)
      }
    }
    return
  }

  if (acceptIndex >= 0) {
    const id = args[acceptIndex + 1]
    const data = await loadMetadata()
    const meta = data.tracks[id]
    const first = meta?.candidates?.[0]
    if (!meta || !first) {
      console.error(`找不到 ${id} 的候选，先运行 pnpm music-meta。`)
      process.exitCode = 1
      return
    }
    if (!first.cover || !await isReachable(first.cover)) {
      console.error(`首选候选没有可用封面，请在 src/config/music.ts 手工填写 cover。`)
      process.exitCode = 1
      return
    }
    data.tracks[id] = {
      ...meta,
      album: first.album || null,
      cover: first.cover,
      trackId: first.trackId,
      collectionId: first.collectionId,
      matchStatus: 'matched',
      source: first.source,
      queriedAt: new Date().toISOString(),
    }
    delete data.tracks[id].candidates
    await saveMetadata(data)
    console.log(`✓ ${id} 已确认为 matched：${first.album}`)
    return
  }

  const targets = songIndex >= 0
    ? [{ id: 'preview', ...parseTitleArtist(`${args[songIndex + 1]} - ${args[songIndex + 2]}`) ?? { title: args[songIndex + 1], artist: args[songIndex + 2] } }]
    : musicConfig.tracks.map(({ id, title, artist }) => ({ id, title, artist }))

  const data = await loadMetadata()
  console.log(`\n正在处理音乐库...\n`)

  let done = 0
  let failed = 0
  let skipped = 0

  for (const [position, track] of targets.entries()) {
    const existing = data.tracks[track.id]
    if (existing?.matchStatus === 'matched' && !force && songIndex < 0) {
      skipped++
      console.log(`[${position + 1}/${targets.length}] ${track.title} - ${track.artist}\n   ↷ 已匹配（${existing.album}），跳过`)
      continue
    }

    console.log(`[${position + 1}/${targets.length}] ${track.title} - ${track.artist}`)
    let candidates = await searchItunes(track.title, track.artist)
    let meta = decide(track.title, track.artist, candidates)
    if (meta.matchStatus === 'not_found') {
      candidates = candidates.concat(await searchMusicBrainz(track.title, track.artist))
      meta = decide(track.title, track.artist, candidates.sort((a, b) => b.score - a.score))
    }
    if (meta.cover && !dryRun && !(await isReachable(meta.cover))) {
      console.log('   ! 封面地址不可达，降级为 review')
      meta = { ...meta, matchStatus: 'review', cover: null, candidates: candidates.slice(0, 3) }
    }

    if (meta.matchStatus === 'matched') {
      console.log(`   ✓ ${meta.source === 'itunes' ? 'Apple Music' : 'MusicBrainz'}`)
      console.log(`   ✓ 专辑：${meta.album}`)
      console.log('   ✓ 封面：已找到')
      done++
    }
    else if (meta.matchStatus === 'review') {
      console.log(`   ! 结果不够确定，标记 review 待人工确认：`)
      for (const candidate of meta.candidates ?? []) {
        console.log(`     ${candidate.score}分 ${candidate.title} / ${candidate.artist} / ${candidate.album}`)
      }
      failed++
    }
    else {
      console.log('   ✗ Apple Music')
      console.log('   ✗ MusicBrainz')
      console.log('   ! 未找到封面')
      failed++
    }

    if (songIndex < 0 && !dryRun) {
      data.tracks[track.id] = meta
    }
  }

  if (songIndex < 0 && !dryRun) {
    await saveMetadata(data)
  }

  console.log(`\n处理完成：\n`)
  console.log(`成功：${done}`)
  console.log(`待确认/失败：${failed}`)
  if (skipped > 0) {
    console.log(`命中缓存跳过：${skipped}`)
  }
  console.log(`\n元数据文件：${METADATA_PATH}\n`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
