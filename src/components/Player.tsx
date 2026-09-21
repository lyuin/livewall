type Props = {
  videoId: string
  /** 左上から読む順の通し番号。編集パネルの行と対応させるために出す。 */
  number: number
  showNumber: boolean
  /** 分割数より後ろの枠。DOM からは外さず隠すだけにして、戻したときの再読み込みを避ける。 */
  hidden: boolean
}

export default function Player({ videoId, number, showNumber, hidden }: Props) {
  // mute=1: 自動再生をブラウザに許可させる唯一の手段
  // playsinline=1: iPad で再生時に全画面へ飛ばさない。無いとグリッドが崩れる
  const src = `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&playsinline=1`

  return (
    <div className="cell" hidden={hidden}>
      <iframe
        src={src}
        title={`ライブ配信 ${number}`}
        allow="autoplay; encrypted-media; picture-in-picture"
        allowFullScreen
      />
      {/* iframe より後ろに置いて絶対配置する。iframe の前に要素を挿入すると
          iframe が DOM 上で動いて再読み込みされる恐れがある。 */}
      {showNumber && <span className="cell__number">{number}</span>}
    </div>
  )
}
