import type { InfoMap, VideoInfo } from './oembed'

// 設定データとは別のキーにする。消えても再取得できるだけの、性質の違うデータなので。
const KEY = 'livewall.titles.v1'

// 配信タイトルは変わることがあるので貯めっぱなしにしない
const TTL_MS = 24 * 60 * 60 * 1000

// 過去に見た配信が増え続けないよう上限を設ける
const MAX_ENTRIES = 200

type Entry = {
  title: string
  author: string
  fetchedAt: number
}

type Stored = Record<string, Entry>

/**
 * 保存済みのタイトルのうち、期限内のものだけ返す。
 */
export function loadVideoInfoCache(): InfoMap {
  const stored = read()
  const now = Date.now()
  const result: InfoMap = {}

  for (const [videoId, entry] of Object.entries(stored)) {
    if (now - entry.fetchedAt > TTL_MS) continue
    result[videoId] = { status: 'ok', title: entry.title, author: entry.author }
  }
  return result
}

export function rememberVideoInfo(videoId: string, info: VideoInfo): void {
  const stored = read()
  stored[videoId] = { title: info.title, author: info.author, fetchedAt: Date.now() }

  // 古いものから捨てる
  const entries = Object.entries(stored).sort((a, b) => b[1].fetchedAt - a[1].fetchedAt)

  try {
    localStorage.setItem(KEY, JSON.stringify(Object.fromEntries(entries.slice(0, MAX_ENTRIES))))
  } catch {
    // 保存できなくても表示はできるので握りつぶす
  }
}

function read(): Stored {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw === null) return {}

    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return {}

    const result: Stored = {}
    for (const [videoId, value] of Object.entries(parsed as Record<string, unknown>)) {
      const { title, author, fetchedAt } = value as Partial<Entry>
      if (typeof title !== 'string' || typeof fetchedAt !== 'number') continue
      result[videoId] = { title, author: typeof author === 'string' ? author : '', fetchedAt }
    }
    return result
  } catch {
    return {}
  }
}
