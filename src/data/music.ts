import { musicConfig } from '@/config/music'
import coverRegistry from './music-covers.json'
import rawMetadata from './music-metadata.json'

export interface MusicTrack {
  id: string
  title: string
  artist: string
  /** Absolute audio URL (R2). Served straight to the <audio> element, so no CORS preflight is involved. */
  src: string
  /** Cover image URL; null makes the player fall back to the letter tile. */
  cover: string | null
  /** Optional URL to an LRC file; the lyric scroller stays hidden without it. */
  lyrics?: string
}

interface MetadataEntry {
  cover?: string | null
  album?: string | null
  matchStatus?: string
}

const metadata = rawMetadata as unknown as { tracks: Record<string, MetadataEntry> }

/**
 * `cover` resolution order: a hand-written value in src/config/music.ts wins,
 * then whatever scripts/music-meta.ts matched, then null (letter tile).
 */
export const musicTracks: MusicTrack[] = musicConfig.tracks.map(({ id, title, artist, url, cover, lyrics }) => ({
  id,
  title,
  artist,
  src: url,
  cover: cover ?? coverRegistry[id as keyof typeof coverRegistry] ?? metadata.tracks[id]?.cover ?? null,
  lyrics,
}))
