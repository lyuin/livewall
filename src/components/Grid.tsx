import type { CSSProperties } from 'react'
import Player from './Player'
import { COLUMNS, type Layout } from '../lib/layout'
import type { InfoMap, InfoResult } from '../lib/oembed'

type Props = {
  videoIds: string[]
  layout: Layout
  info: InfoMap
  /** 動画 ID ごとの読み直し回数。key に含めることでその枠だけ作り直す。 */
  reloads: Record<string, number>
  playing: boolean
  /** 編集中だけ枠に番号を出す。常時出すと映像の邪魔になる。 */
  showNumbers: boolean
  showCaptions: boolean
}

export default function Grid({
  videoIds,
  layout,
  info,
  reloads,
  playing,
  showNumbers,
  showCaptions,
}: Props) {
  const columns = COLUMNS[layout]
  const rows = Math.ceil(layout / columns)

  // 枠が余っているときだけ空セルで埋める
  const emptyCount = Math.max(0, layout - videoIds.length)

  return (
    <div
      className="grid"
      style={{ '--cols': columns, '--rows': rows } as CSSProperties}
    >
      {playing
        ? videoIds.map((id, index) => (
            // key は動画 ID。位置を key にすると並べ替えや削除で iframe が作り直され、
            // 配信が止まって読み込み直しになる。
            // 読み直し回数を添えているのは、その番号を上げたときだけ意図的に作り直すため。
            <Player
              key={`${id}:${reloads[id] ?? 0}`}
              videoId={id}
              number={index + 1}
              showNumber={showNumbers}
              info={info[id]}
              showCaption={showCaptions}
              hidden={index >= layout}
            />
          ))
        : // 止めるときは iframe を DOM から外す。一時停止ではプレイヤーが生きたままで
          // 通信とデコードが続きうるため、確実に落とすには外すのが早い。
          // ライブ配信は再開しても現在時刻に飛ぶので、再生位置を保つ意味もない。
          videoIds.slice(0, layout).map((id, index) => (
            <div key={`stopped-${id}`} className="cell cell--stopped">
              <span className="cell__number">{index + 1}</span>
              <span className="cell__stopped">{stoppedLabel(info[id])}</span>
            </div>
          ))}

      {Array.from({ length: emptyCount }, (_, index) => (
        <div key={`empty-${index}`} className="cell cell--empty">
          {showNumbers && (
            <span className="cell__number">{videoIds.length + index + 1}</span>
          )}
        </div>
      ))}
    </div>
  )
}

/** 止めている枠に出す文字。何が入っているか分かればよいので、名前が取れなければ空にする。 */
function stoppedLabel(info: InfoResult | undefined): string {
  return info !== undefined && info.status === 'ok' ? info.title : ''
}
