import { useState } from 'react'
import type { Layout } from '../lib/layout'
import type { InfoMap, InfoResult } from '../lib/oembed'
import { extractVideoId, watchUrl } from '../lib/youtube'

type Props = {
  layout: Layout
  videoIds: string[]
  info: InfoMap
  onReplace: (index: number, videoId: string) => void
  onRemove: (index: number) => void
}

export default function SlotEditor({ layout, videoIds, info, onReplace, onRemove }: Props) {
  /**
   * 入力を検証して反映する。問題があればエラー文を返し、行側に表示させる。
   */
  function submit(index: number, text: string): string | null {
    const videoId = extractVideoId(text)
    if (videoId === null) return 'Not a YouTube URL'

    const duplicate = videoIds.indexOf(videoId)
    if (duplicate !== -1 && duplicate !== index) {
      return `Same as #${duplicate + 1}`
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
          info={info[videoId]}
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
  info: InfoResult | undefined
  /** 現在の分割数では画面に出ていない枠 */
  hidden: boolean
  onSubmit: (text: string) => string | null
  onRemove: () => void
}

function SlotRow({ number, videoId, info, hidden, onSubmit, onRemove }: RowProps) {
  // 普段はタイトルを読むだけ。URL を常に出すと読みづらく、9 行並ぶと画面が埋まる。
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(() => watchUrl(videoId))
  const [error, setError] = useState<string | null>(null)

  function apply() {
    const message = onSubmit(text)
    setError(message)
    if (message === null) setEditing(false)
  }

  function cancel() {
    setText(watchUrl(videoId))
    setError(null)
    setEditing(false)
  }

  const label = toLabel(info, videoId)

  return (
    <li className="slot">
      <span className="slot__number">{number}</span>

      {editing ? (
        <>
          <input
            className="slot__input"
            type="text"
            value={text}
            onChange={(event) => setText(event.target.value)}
            aria-label={`URL for slot ${number}`}
            autoFocus
          />
          <button type="button" onClick={apply} disabled={text.trim() === ''}>
            Save
          </button>
          <button type="button" onClick={cancel}>
            Cancel
          </button>
        </>
      ) : (
        <>
          <span className={`slot__label${label.isError ? ' slot__label--error' : ''}`}>
            <span className="slot__title">{label.title}</span>
            {label.author !== '' && <span className="slot__author">{label.author}</span>}
          </span>
          {hidden && <span className="note">Hidden</span>}
          <button type="button" onClick={() => setEditing(true)}>
            Replace
          </button>
          <button type="button" className="danger" onClick={onRemove}>
            Remove
          </button>
        </>
      )}

      {error !== null && <span className="note note--error">{error}</span>}
    </li>
  )
}

function toLabel(
  info: InfoResult | undefined,
  videoId: string,
): { title: string; author: string; isError: boolean } {
  if (info === undefined) return { title: 'Loading', author: '', isError: false }

  switch (info.status) {
    case 'ok':
      return { title: info.title, author: info.author, isError: false }
    case 'missing':
      return { title: 'Unavailable — deleted or private', author: '', isError: true }
    case 'blocked':
      return { title: 'Embedding may be blocked', author: '', isError: true }
    default:
      // 通信できなかったときはタイトルが分からないので ID を出す
      return { title: videoId, author: '', isError: false }
  }
}
