import { useState, type MouseEvent } from 'react'
import SlotEditor from './SlotEditor'
import { LAYOUTS, MAX_PLAYERS, layoutLabel, type Layout } from '../lib/layout'
import type { InfoMap } from '../lib/oembed'
import { buildShareLink } from '../lib/share'
import { extractVideoIds } from '../lib/youtube'

type Props = {
  layout: Layout
  videoIds: string[]
  info: InfoMap
  /** 操作しないと消える。時計の帯かこの行をタップすると戻る。 */
  visible: boolean
  /** ツールバーを触っている間は消さないよう、タイマーを張り直させる。 */
  onInteract: () => void
  /** 行の余白を押したときの表示切り替え。 */
  onToggle: () => void
  /** セットを変えたがリンクを控えていない状態。タブを閉じると変更を失う。 */
  unsaved: boolean
  onSaved: () => void
  playing: boolean
  onPlayingChange: (playing: boolean) => void
  /** 編集パネルの開閉。グリッド側の番号表示と連動させるため App が持つ。 */
  editing: boolean
  onEditingChange: (editing: boolean) => void
  onLayoutChange: (layout: Layout) => void
  onAdd: (ids: string[]) => void
  onReplace: (index: number, videoId: string) => void
  onRemove: (index: number) => void
  onReload: (videoId: string) => void
  onClear: () => void
}

type CopyState = 'idle' | 'copied' | 'failed'

export default function Toolbar({
  layout,
  videoIds,
  info,
  visible,
  onInteract,
  onToggle,
  editing,
  onEditingChange,
  onLayoutChange,
  onAdd,
  onReplace,
  onRemove,
  onReload,
  onClear,
  unsaved,
  onSaved,
  playing,
  onPlayingChange,
}: Props) {
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
  }

  function handleClear() {
    if (count > 0 && !window.confirm(`Remove all ${count} streams?`)) return
    onClear()
  }

  async function handleCopyLink() {
    const url = buildShareLink({ layout, videoIds })
    setLink(url)
    try {
      await navigator.clipboard.writeText(url)
      setCopyState('copied')
      // 控えられたので、リンクを保存してほしいという促しを下げる
      onSaved()
      window.setTimeout(() => setCopyState('idle'), 2000)
    } catch {
      // クリップボードが使えない場合でもリンクを失わせない。手でコピーできるよう表示する。
      setCopyState('failed')
    }
  }

  /**
   * 行のどこを押しても反応させる。ただしボタンのクリックもここまで上がってくるので、
   * ボタンの上なら切り替えずにタイマーを延ばすだけにする。
   * そうしないと Copy link を押した瞬間にツールバーが消える。
   */
  function handleRowClick(event: MouseEvent<HTMLDivElement>) {
    if ((event.target as HTMLElement).closest('button') !== null) {
      onInteract()
      return
    }
    onToggle()
  }

  return (
    <>
      {/* 行そのものは消さない。中身だけ消して、行は常に切り替えの受け皿として残す。
          行まで visibility を切ると、消えている状態では押せなくなってしまう。 */}
      <div className="toolbar" onClick={handleRowClick}>
        <div className={`toolbar__content${visible ? '' : ' toolbar__content--hidden'}`}>
          <div className="layouts" role="group" aria-label="Grid layout">
            {LAYOUTS.map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={value === layout}
                onClick={() => onLayoutChange(value)}
              >
                {layoutLabel(value)}
              </button>
            ))}
          </div>

          <div className="actions">
            <button
              type="button"
              onClick={() => onPlayingChange(!playing)}
              disabled={count === 0}
            >
              {playing ? 'Stop all' : 'Play all'}
            </button>
            <button type="button" aria-expanded={editing} onClick={() => onEditingChange(!editing)}>
              {editing ? 'Done' : count === 0 ? 'Add streams' : 'Edit streams'}
            </button>
            <button
              type="button"
              // 控えるまで印を残す。案内バーが消えたあとも気づけるようにするため。
              // 空のセットは控える意味がないので印を出さない。
              className={unsaved && count > 0 ? 'is-pending' : undefined}
              onClick={handleCopyLink}
              disabled={count === 0}
            >
              {copyState === 'copied' ? 'Copied' : 'Copy link'}
            </button>
          </div>
        </div>
      </div>

      {/* 編集中は出さない。編集パネルと同じ位置に重なるため。
          パネルを閉じたところで促す。 */}
      {unsaved && count > 0 && visible && !editing && copyState !== 'failed' && (
        <div className="panel banner">
          <p className="banner__text">
            This tab keeps its set in the URL. Save the new link, or the change is lost when the tab
            closes.
          </p>
          <div className="banner__row">
            <input
              className="link"
              type="text"
              readOnly
              value={buildShareLink({ layout, videoIds })}
              aria-label="Current link"
            />
            <button type="button" onClick={handleCopyLink}>
              Copy link
            </button>
            <button type="button" onClick={onSaved}>
              Dismiss
            </button>
          </div>
        </div>
      )}

      {copyState === 'failed' && (
        <div className="panel">
          <p className="note note--error">Couldn&apos;t copy. Copy the link manually.</p>
          <input className="link" type="text" value={link} readOnly aria-label="Share link" />
          <div className="panel__actions">
            <button type="button" onClick={() => setCopyState('idle')}>
              Close
            </button>
          </div>
        </div>
      )}

      {editing && (
        // グリッドにかぶせる。ツールバー内に置くとグリッドの高さが変わり、
        // 開閉のたびに再生中の iframe がリサイズされてしまう。
        <div className="panel">
          {count > 0 && (
            <SlotEditor
              layout={layout}
              videoIds={videoIds}
              info={info}
              onReplace={onReplace}
              onRemove={onRemove}
              onReload={onReload}
            />
          )}

          {full ? (
            <p className="note">Limit reached ({MAX_PLAYERS}). Use Replace on a row to swap.</p>
          ) : (
            <>
              <textarea
                value={text}
                onChange={(event) => setText(event.target.value)}
                aria-label="YouTube URLs to add"
                placeholder="Paste YouTube URLs — one per line"
                rows={3}
              />
              <div className="panel__actions">
                <button type="button" onClick={handleAdd} disabled={text.trim() === ''}>
                  Add
                </button>
              </div>
            </>
          )}

          {invalid.length > 0 && (
            <p className="note note--error">
              {invalid.length} not recognised as YouTube URLs: {invalid.join(' / ')}
            </p>
          )}

          {/* 全消去はここに隠す。常時見えるところに置くと、強い操作が近すぎる。 */}
          {count > 0 && (
            <div className="panel__footer">
              <button type="button" className="danger" onClick={handleClear}>
                Clear all
              </button>
            </div>
          )}
        </div>
      )}
    </>
  )
}
