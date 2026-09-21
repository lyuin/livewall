import { LAYOUTS, MAX_PLAYERS, type Layout } from './layout'
import { VIDEO_ID_LENGTH, isVideoId } from './youtube'

// リンク形式の版。読めない版のリンクは黙って無視する。
// リンクは localStorage より長く残る（メモアプリ等に保存される）ため、
// 形式を変えるときは版を上げて古いリンクを誤読しないようにする。
const VERSION = '1'

export type SharedSet = {
  layout: Layout
  videoIds: string[]
}

/**
 * 状態を URL の # 以降に収める。形式は `#<版>.<分割数>.<動画 ID の連結>`。
 *
 * 動画 ID は 11 文字固定なので、区切り文字を入れずに連結できる。
 * 動画 ID の中身はほぼランダムな英数字で圧縮の余地がないため、
 * 9 本で約 100 文字になるのが下限。これ以上短くするには対応表を持つサーバーが必要。
 *
 * # より後ろはブラウザがサーバーへ送信しない。つまり動画 ID は端末とリンクの文字列の
 * 中だけに存在し、GitHub には渡らない。
 */
export function encodeShareHash({ layout, videoIds }: SharedSet): string {
  return `#${VERSION}.${layout}.${videoIds.join('')}`
}

export function decodeShareHash(hash: string): SharedSet | null {
  const parts = hash.replace(/^#/, '').split('.')
  if (parts.length !== 3) return null

  const [version, rawLayout, rawIds] = parts
  if (version !== VERSION) return null

  const layout = LAYOUTS.find((value) => String(value) === rawLayout)
  if (layout === undefined) return null

  // 11 文字の倍数でなければ、途中で切れたリンクか別形式
  if (rawIds.length === 0 || rawIds.length % VIDEO_ID_LENGTH !== 0) return null

  const count = rawIds.length / VIDEO_ID_LENGTH
  if (count > MAX_PLAYERS) return null

  const videoIds: string[] = []
  for (let index = 0; index < count; index++) {
    const id = rawIds.slice(index * VIDEO_ID_LENGTH, (index + 1) * VIDEO_ID_LENGTH)
    if (!isVideoId(id)) return null
    if (!videoIds.includes(id)) videoIds.push(id)
  }
  return { layout, videoIds }
}

export function buildShareLink(set: SharedSet): string {
  const { origin, pathname } = window.location
  return `${origin}${pathname}${encodeShareHash(set)}`
}
