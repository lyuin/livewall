import { watchUrl } from './youtube'

// YouTube の oEmbed。API キーが不要で、CORS も許可されているためブラウザから直接呼べる。
// 動画 ID を YouTube へ送ることになるが、埋め込みプレイヤー自体が既に送っているので
// 新しく漏れる情報はない。
const ENDPOINT = 'https://www.youtube.com/oembed'

export type VideoInfo = {
  status: 'ok'
  title: string
  author: string
}

export type InfoResult =
  | VideoInfo
  /** 存在しない、削除された、非公開 */
  | { status: 'missing' }
  /** 埋め込みが許可されていない */
  | { status: 'blocked' }
  /** 通信できなかった。恒久的な失敗ではないので保存せず次回また試す。 */
  | { status: 'error' }

export type InfoMap = Record<string, InfoResult>

export async function fetchVideoInfo(videoId: string): Promise<InfoResult> {
  const url = `${ENDPOINT}?url=${encodeURIComponent(watchUrl(videoId))}&format=json`

  try {
    const response = await fetch(url)

    if (response.status === 404) return { status: 'missing' }
    if (response.status === 401) return { status: 'blocked' }
    if (!response.ok) return { status: 'error' }

    const body: unknown = await response.json()
    const { title, author_name: author } = body as {
      title?: unknown
      author_name?: unknown
    }

    if (typeof title !== 'string') return { status: 'error' }
    return { status: 'ok', title, author: typeof author === 'string' ? author : '' }
  } catch {
    return { status: 'error' }
  }
}
