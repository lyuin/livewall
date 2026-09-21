import { useEffect, useState } from 'react'
import Grid from './components/Grid'
import Toolbar from './components/Toolbar'
import { MAX_PLAYERS, type Layout } from './lib/layout'
import { decodeShareHash, type SharedSet } from './lib/share'
import { load, save, type ActiveSet } from './lib/storage'

type Boot = {
  initial: ActiveSet
  /** 取り込むか捨てるかを利用者に確認する必要がある共有リンクの内容 */
  pendingShare: SharedSet | null
}

function boot(): Boot {
  const stored = load()
  const shared = decodeShareHash(window.location.hash)
  if (shared === null) return { initial: stored, pendingShare: null }

  // ハッシュを残すとリロードのたびに共有リンクの内容へ引き戻され、以降の編集が消える
  window.history.replaceState(null, '', window.location.pathname)

  // 空の端末で開いたときは確認しない。デバイス間移行という本来の使い方で邪魔になる。
  if (stored.videoIds.length === 0) return { initial: shared, pendingShare: null }

  // 既に入っているときだけ聞く。黙って置き換えると 9 本を失う事故になる。
  return { initial: stored, pendingShare: shared }
}

// モジュール読み込み時に 1 回だけ評価する。useState の初期化関数に入れると
// StrictMode で 2 回呼ばれ、ハッシュの消去が二重に走る。
const BOOT = boot()

export default function App() {
  const [videoIds, setVideoIds] = useState<string[]>(BOOT.initial.videoIds)
  const [layout, setLayout] = useState<Layout>(BOOT.initial.layout)
  const [pendingShare, setPendingShare] = useState<SharedSet | null>(BOOT.pendingShare)
  const [editing, setEditing] = useState(false)

  useEffect(() => {
    save({ videoIds, layout })
  }, [videoIds, layout])

  function addVideoIds(ids: string[]) {
    setVideoIds((current) => {
      // 同じ配信を 2 枠に出す意味がなく、React の key も衝突するため重複は捨てる
      const merged = [...current]
      for (const id of ids) {
        if (!merged.includes(id)) merged.push(id)
      }
      return merged.slice(0, MAX_PLAYERS)
    })
  }

  function replaceVideoId(index: number, videoId: string) {
    setVideoIds((current) => {
      const next = [...current]
      next[index] = videoId
      return next
    })
  }

  function removeVideoId(index: number) {
    // 詰めて持つので、後ろの枠が 1 つずつ繰り上がる
    setVideoIds((current) => current.filter((_, position) => position !== index))
  }

  function acceptShare() {
    if (pendingShare === null) return
    setVideoIds(pendingShare.videoIds)
    setLayout(pendingShare.layout)
    setPendingShare(null)
  }

  return (
    <>
      <Toolbar
        layout={layout}
        videoIds={videoIds}
        editing={editing}
        onEditingChange={setEditing}
        onLayoutChange={setLayout}
        onAdd={addVideoIds}
        onReplace={replaceVideoId}
        onRemove={removeVideoId}
        onClear={() => setVideoIds([])}
      />

      {pendingShare !== null && (
        <div className="panel banner">
          <p className="banner__text">
            共有リンクに {pendingShare.videoIds.length} 本入っている。取り込むと今の
            {videoIds.length} 本は消える。
          </p>
          <div className="banner__actions">
            <button type="button" onClick={acceptShare}>
              取り込む
            </button>
            <button type="button" onClick={() => setPendingShare(null)}>
              無視する
            </button>
          </div>
        </div>
      )}

      <Grid videoIds={videoIds} layout={layout} showNumbers={editing} />
    </>
  )
}
