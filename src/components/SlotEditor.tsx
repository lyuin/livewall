import { useState } from 'react'
import type { Layout } from '../lib/layout'
import { extractVideoId, watchUrl } from '../lib/youtube'

type Props = {
  layout: Layout
  videoIds: string[]
  onReplace: (index: number, videoId: string) => void
  onRemove: (index: number) => void
}

export default function SlotEditor({ layout, videoIds, onReplace, onRemove }: Props) {
  /**
   * 入力を検証して反映する。問題があればエラー文を返し、行側に表示させる。
   */
  function submit(index: number, text: string): string | null {
    const videoId = extractVideoId(text)
    if (videoId === null) return 'YouTube の URL として読めなかった'

    const duplicate = videoIds.indexOf(videoId)
    if (duplicate !== -1 && duplicate !== index) {
      return `${duplicate + 1} 番と同じ配信`
    }

    onReplace(index, videoId)
    return null
  }

  return (
    <ul className="slots">
      {videoIds.map((videoId, index) => (
        // key に動画 ID を含めることで、枠の中身が変わったときに行が作り直され、
        // 入力欄の内容が新しい URL に戻る。
        <SlotRow
          key={`${index}-${videoId}`}
          number={index + 1}
          videoId={videoId}
          hidden={index >= layout}
          onSubmit={(text) => submit(index, text)}
          onRemove={() => onRemove(index)}
        />
      ))}
    </ul>
  )
}

type RowProps = {
  number: number
  videoId: string
  /** 現在の分割数では画面に出ていない枠 */
  hidden: boolean
  onSubmit: (text: string) => string | null
  onRemove: () => void
}

function SlotRow({ number, videoId, hidden, onSubmit, onRemove }: RowProps) {
  const [text, setText] = useState(() => watchUrl(videoId))
  const [error, setError] = useState<string | null>(null)

  const changed = text.trim() !== watchUrl(videoId)

  function handleSubmit() {
    setError(onSubmit(text))
  }

  return (
    <li className="slot">
      <span className="slot__number" aria-hidden="true">
        {number}
      </span>
      <input
        className="slot__input"
        type="text"
        value={text}
        onChange={(event) => setText(event.target.value)}
        aria-label={`${number} 番の URL`}
      />
      <button type="button" onClick={handleSubmit} disabled={!changed}>
        変更
      </button>
      <button type="button" onClick={onRemove}>
        削除
      </button>
      {hidden && <span className="note">この分割数では非表示</span>}
      {error !== null && <span className="note note--error">{error}</span>}
    </li>
  )
}
