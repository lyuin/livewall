import type { InfoResult } from '../lib/oembed'

type Props = {
  videoId: string
  /** 左上から読む順の通し番号。編集パネルの行と対応させるために出す。 */
  number: number
  showNumber: boolean
  info: InfoResult | undefined
  showCaption: boolean
  /** 分割数より後ろの枠。DOM からは外さず隠すだけにして、戻したときの再読み込みを避ける。 */
  hidden: boolean
}

export default function Player({
  videoId,
  number,
  showNumber,
  info,
  showCaption,
  hidden,
}: Props) {
  // mute=1: 自動再生をブラウザに許可させる唯一の手段
  // playsinline=1: iPad で再生時に全画面へ飛ばさない。無いとグリッドが崩れる
  const src = `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&playsinline=1`
  const caption = toCaption(info)

  return (
    <div className="cell" hidden={hidden}>
      <iframe
        src={src}
        title={caption?.title ?? `ライブ配信 ${number}`}
        allow="autoplay; encrypted-media; picture-in-picture"
        allowFullScreen
      />

      {/* 以下は iframe より後ろに置いて絶対配置する。iframe の前に要素を挿入すると
          iframe が DOM 上で動いて再読み込みされる恐れがある。 */}
      {showNumber && <span className="cell__number">{number}</span>}

      {caption !== null && (
        // 要素は残したまま opacity だけ落とす。出し入れで DOM を組み替えると
        // 隣の iframe に影響が出る可能性があるため。
        <div
          className={
            `cell__caption${caption.isError ? ' cell__caption--error' : ''}` +
            `${showCaption ? '' : ' cell__caption--hidden'}`
          }
        >
          <span className="cell__title">{caption.title}</span>
          {caption.author !== '' && <span className="cell__author">{caption.author}</span>}
        </div>
      )}
    </div>
  )
}

type Caption = {
  title: string
  author: string
  isError: boolean
}

function toCaption(info: InfoResult | undefined): Caption | null {
  // 読み込み中と通信失敗は何も出さない。一瞬出る文字や消えない警告はノイズになる。
  if (info === undefined || info.status === 'error') return null

  if (info.status === 'ok') return { title: info.title, author: info.author, isError: false }

  if (info.status === 'missing') {
    return { title: '見つからない（削除または非公開）', author: '', isError: true }
  }
  return { title: '埋め込みが許可されていない可能性', author: '', isError: true }
}
