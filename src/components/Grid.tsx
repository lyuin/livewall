import type { CSSProperties } from 'react'
import Player from './Player'
import { COLUMNS, type Layout } from '../lib/layout'
import type { InfoMap } from '../lib/oembed'

type Props = {
  videoIds: string[]
  layout: Layout
  info: InfoMap
  /** 編集中だけ枠に番号を出す。常時出すと映像の邪魔になる。 */
  showNumbers: boolean
}

export default function Grid({ videoIds, layout, info, showNumbers }: Props) {
  const columns = COLUMNS[layout]
  const rows = Math.ceil(layout / columns)

  // 枠が余っているときだけ空セルで埋める
  const emptyCount = Math.max(0, layout - videoIds.length)

  return (
    <div
      className="grid"
      style={{ '--cols': columns, '--rows': rows } as CSSProperties}
    >
      {videoIds.map((id, index) => (
        // key は動画 ID。位置を key にすると並べ替えや削除で iframe が作り直され、
        // 配信が止まって読み込み直しになる。
        <Player
          key={id}
          videoId={id}
          number={index + 1}
          showNumber={showNumbers}
          info={info[id]}
          hidden={index >= layout}
        />
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
