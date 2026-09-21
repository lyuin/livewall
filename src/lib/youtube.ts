// YouTube の動画 ID は 11 文字。URL 中の他のパス断片と区別する手がかりがこれしかない。
export const VIDEO_ID_LENGTH = 11

const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/

export function isVideoId(value: string): boolean {
  return VIDEO_ID.test(value)
}

// ID がパスの 2 番目に来るホスト側の形式。/live/ はライブ配信の共有リンクで実際に使われる。
const ID_IN_PATH = ['live', 'embed', 'shorts', 'v']

const YOUTUBE_HOSTS = ['youtube.com', 'm.youtube.com', 'music.youtube.com']

/**
 * URL や ID 直打ちから動画 ID を取り出す。取り出せなければ null。
 */
export function extractVideoId(input: string): string | null {
  const text = input.trim()
  if (!text) return null

  // ID をそのまま貼られる場合がある
  if (VIDEO_ID.test(text)) return text

  let url: URL
  try {
    // スキームを省いてコピーされることが多いので補う
    url = new URL(/^https?:\/\//i.test(text) ? text : `https://${text}`)
  } catch {
    return null
  }

  const host = url.hostname.replace(/^www\./, '')
  if (host === 'youtu.be') return firstPathSegment(url)
  if (!YOUTUBE_HOSTS.includes(host)) return null

  const v = url.searchParams.get('v')
  if (v && VIDEO_ID.test(v)) return v

  const segments = pathSegments(url)
  if (segments.length >= 2 && ID_IN_PATH.includes(segments[0])) {
    return VIDEO_ID.test(segments[1]) ? segments[1] : null
  }
  return null
}

/**
 * 動画 ID から視聴用の URL を組み立てる。
 * 貼られた元の URL は保存していないので、編集画面に出すぶんはここで復元する。
 */
export function watchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`
}

/**
 * 改行区切りのテキストをまとめて解析する。9 本の URL を毎回 1 本ずつ貼るのが辛いため。
 * 解析できなかった行は invalid に入れて、どれが弾かれたか分かるようにする。
 */
export function extractVideoIds(text: string): { ids: string[]; invalid: string[] } {
  const ids: string[] = []
  const invalid: string[] = []

  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed) continue

    const id = extractVideoId(trimmed)
    if (id === null) {
      invalid.push(trimmed)
    } else if (!ids.includes(id)) {
      ids.push(id)
    }
  }
  return { ids, invalid }
}

function pathSegments(url: URL): string[] {
  return url.pathname.split('/').filter(Boolean)
}

function firstPathSegment(url: URL): string | null {
  const first = pathSegments(url)[0]
  return first !== undefined && VIDEO_ID.test(first) ? first : null
}
