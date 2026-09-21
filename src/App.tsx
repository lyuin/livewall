import { useEffect, useState } from 'react'
import { useVideoInfo } from './hooks/useVideoInfo'
import Grid from './components/Grid'
import Toolbar from './components/Toolbar'
import WorldClock from './components/WorldClock'
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

// ツールバーと配信名を出しておく時間。9 本ぶん読み終えるには 10 秒では足りなかった。
const CHROME_VISIBLE_MS = 20_000

export default function App() {
  const [videoIds, setVideoIds] = useState<string[]>(BOOT.initial.videoIds)
  const [layout, setLayout] = useState<Layout>(BOOT.initial.layout)
  const [pendingShare, setPendingShare] = useState<SharedSet | null>(BOOT.pendingShare)
  const [editing, setEditing] = useState(false)
  const info = useVideoInfo(videoIds)

  // ツールバーと配信名の表示。時計の帯だけは常に出しておき、再表示の受け皿にする。
  const [chromeVisible, setChromeVisible] = useState(true)
  // 表示し直した時刻。値が変わることでタイマーを張り直す。
  // chromeVisible だけを見ていると、表示中にもう一度押しても状態が変わらず時間が延びない。
  const [revealedAt, setRevealedAt] = useState(() => Date.now())

  useEffect(() => {
    save({ videoIds, layout })
  }, [videoIds, layout])

  // 一定時間で消す。映像を覆い続けないため。
  useEffect(() => {
    if (!chromeVisible) return

    const timer = window.setTimeout(() => setChromeVisible(false), CHROME_VISIBLE_MS)
    return () => window.clearTimeout(timer)
  }, [chromeVisible, revealedAt])

  function revealChrome() {
    setChromeVisible(true)
    setRevealedAt(Date.now())
  }

  // 時計の帯は押すたびに出したり消したりする。出すだけだと、消したいときに
  // タイマーが切れるまで待つしかなく直感に反する。
  function toggleChrome() {
    if (chromeVisible) {
      setChromeVisible(false)
      return
    }
    revealChrome()
  }

  // 中身が変わったときは、今それが何なのかを知りたい場面なので配信名を出し直す。
  // 変更を起こしたイベント側でやる。effect で videoIds を監視して出し直すと
  // 描画のたびに state を書き換える形になり、余分な再描画を招く。
  function addVideoIds(ids: string[]) {
    setVideoIds((current) => {
      // 同じ配信を 2 枠に出す意味がなく、React の key も衝突するため重複は捨てる
      const merged = [...current]
      for (const id of ids) {
        if (!merged.includes(id)) merged.push(id)
      }
      return merged.slice(0, MAX_PLAYERS)
    })
    revealChrome()
  }

  function replaceVideoId(index: number, videoId: string) {
    setVideoIds((current) => {
      const next = [...current]
      next[index] = videoId
      return next
    })
    revealChrome()
  }

  function removeVideoId(index: number) {
    // 詰めて持つので、後ろの枠が 1 つずつ繰り上がる
    setVideoIds((current) => current.filter((_, position) => position !== index))
    revealChrome()
  }

  function acceptShare() {
    if (pendingShare === null) return
    setVideoIds(pendingShare.videoIds)
    setLayout(pendingShare.layout)
    setPendingShare(null)
    revealChrome()
  }

  return (
    <>
      <Toolbar
        layout={layout}
        videoIds={videoIds}
        info={info}
        visible={chromeVisible || editing}
        onInteract={revealChrome}
        onToggle={toggleChrome}
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
            This link has {pendingShare.videoIds.length} streams. Importing replaces the current{' '}
            {videoIds.length}.
          </p>
          <div className="banner__actions">
            <button type="button" onClick={acceptShare}>
              Import
            </button>
            <button type="button" onClick={() => setPendingShare(null)}>
              Dismiss
            </button>
          </div>
        </div>
      )}

      <WorldClock onToggle={toggleChrome} />
      <Grid
        videoIds={videoIds}
        layout={layout}
        info={info}
        showNumbers={editing}
        // 編集中は常に出す。どの枠が何かを確かめている場面なので消してはいけない。
        showCaptions={chromeVisible || editing}
      />
    </>
  )
}
