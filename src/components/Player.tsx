type Props = {
  videoId: string
  /** 分割数より後ろの枠。DOM からは外さず隠すだけにして、戻したときの再読み込みを避ける。 */
  hidden: boolean
}

export default function Player({ videoId, hidden }: Props) {
  // mute=1: 自動再生をブラウザに許可させる唯一の手段
  // playsinline=1: iPad で再生時に全画面へ飛ばさない。無いとグリッドが崩れる
  const src = `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&playsinline=1`

  return (
    <div className="cell" hidden={hidden}>
      <iframe
        src={src}
        title={`ライブ配信 ${videoId}`}
        allow="autoplay; encrypted-media; picture-in-picture"
        allowFullScreen
      />
    </div>
  )
}
