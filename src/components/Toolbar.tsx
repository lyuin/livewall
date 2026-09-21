import { useState } from 'react'
import { LAYOUTS, MAX_PLAYERS, type Layout } from '../lib/layout'
import { buildShareLink } from '../lib/share'
import { extractVideoIds } from '../lib/youtube'

type Props = {
  layout: Layout
  videoIds: string[]
  onLayoutChange: (layout: Layout) => void
  onAdd: (ids: string[]) => void
  onClear: () => void
}

type CopyState = 'idle' | 'copied' | 'failed'

export default function Toolbar({ layout, videoIds, onLayoutChange, onAdd, onClear }: Props) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [invalid, setInvalid] = useState<string[]>([])
  const [copyState, setCopyState] = useState<CopyState>('idle')
  const [link, setLink] = useState('')

  const count = videoIds.length
  const full = count >= MAX_PLAYERS

  function handleAdd() {
    const result = extractVideoIds(text)
    setInvalid(result.invalid)

    if (result.ids.length === 0) return
    onAdd(result.ids)
    setText('')

    // 弾かれた行が残っているときは、何が失敗したか読めるようパネルを開いたままにする
    if (result.invalid.length === 0) setOpen(false)
  }

  function handleClear() {
    if (count > 0 && !window.confirm(`${count} 本すべて削除する？`)) return
    onClear()
  }

  async function handleCopyLink() {
    const url = buildShareLink({ layout, videoIds })
    setLink(url)
    try {
      await navigator.clipboard.writeText(url)
      setCopyState('copied')
      window.setTimeout(() => setCopyState('idle'), 2000)
    } catch {
      // クリップボードが使えない場合でもリンクを失わせない。手でコピーできるよう表示する。
      setCopyState('failed')
    }
  }

  return (
    <>
      <div className="toolbar">
        <div className="layouts" role="group" aria-label="分割数">
          {LAYOUTS.map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={value === layout}
              onClick={() => onLayoutChange(value)}
            >
              {value}分割
            </button>
          ))}
        </div>

        <span className="count">
          {count} / {MAX_PLAYERS} 本
        </span>

        <button type="button" aria-expanded={open} onClick={() => setOpen(!open)}>
          {open ? '閉じる' : 'ライブ動画を追加'}
        </button>
        <button type="button" onClick={handleCopyLink} disabled={count === 0}>
          {copyState === 'copied' ? 'コピーした' : '設定リンクをコピー'}
        </button>
        <button type="button" onClick={handleClear} disabled={count === 0}>
          全消去
        </button>
      </div>

      {copyState === 'failed' && (
        <div className="panel">
          <p className="note note--error">
            クリップボードにコピーできなかった。下のリンクを手でコピーして。
          </p>
          <input className="link" type="text" value={link} readOnly aria-label="共有リンク" />
          <div className="panel__actions">
            <button type="button" onClick={() => setCopyState('idle')}>
              閉じる
            </button>
          </div>
        </div>
      )}

      {open && (
        // グリッドの上にかぶせる。ツールバー内に置くとグリッドの高さが変わり、
        // 開閉のたびに再生中の iframe がリサイズされてしまう。
        <div className="panel">
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            aria-label="YouTube の URL"
            placeholder="YouTube ライブの URL を貼る（1 行に 1 つ。まとめて貼れる）"
            rows={5}
            autoFocus
          />
          <div className="panel__actions">
            <button type="button" onClick={handleAdd} disabled={text.trim() === '' || full}>
              追加
            </button>
            {full && <span className="note">上限 {MAX_PLAYERS} 本に達している</span>}
          </div>
          {invalid.length > 0 && (
            <p className="note note--error">
              {invalid.length} 行は YouTube の URL として読めなかった: {invalid.join(' / ')}
            </p>
          )}
        </div>
      )}
    </>
  )
}
