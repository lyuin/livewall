import { useEffect, useState } from 'react'
import { useVideoInfo } from './hooks/useVideoInfo'
import Grid from './components/Grid'
import Toolbar from './components/Toolbar'
import WorldClock from './components/WorldClock'
import { MAX_PLAYERS, type Layout } from './lib/layout'
import { decodeShareHash, stateUrl } from './lib/share'
import { load, save, type ActiveSet } from './lib/storage'

// ツールバーと配信名を出しておく時間。9 本ぶん読み終えるには 10 秒では足りなかった。
const CHROME_VISIBLE_MS = 20_000

/**
 * このタブの初期状態。
 * URL のハッシュがそのタブの状態で、何も付いていなければ最後に使ったセットを読む。
 * localStorage はブラウザに 1 つしかないので、それだけではタブごとに別のセットを
 * 持てない（後から書いたタブが前のタブのセットを潰す）。
 */
function boot(): ActiveSet {
  return decodeShareHash(window.location.hash) ?? load()
}

// モジュール読み込み時に 1 回だけ評価する。useState の初期化関数に入れると
// StrictMode で 2 回呼ばれる。
const BOOT = boot()

export default function App() {
  const [videoIds, setVideoIds] = useState<string[]>(BOOT.videoIds)
  const [layout, setLayout] = useState<Layout>(BOOT.layout)
  const [editing, setEditing] = useState(false)
  const { info, refresh } = useVideoInfo(videoIds)

  // 枠ごとの読み直しの回数。動画 ID に添えて React の key にすることで、
  // その枠の iframe だけを作り直す。ID を鍵にするのは、枠の位置が繰り上がっても
  // 追従させるため。
  const [reloads, setReloads] = useState<Record<string, number>>({})

  // 見るのをやめている状態。URL にも localStorage にも入れない。
  // セットの内容ではなく、その場の見方なので持ち越す意味がない。
  const [playing, setPlaying] = useState(true)

  // セットを変えたがリンクを控えていない状態。この状態でタブを閉じると変更を失う。
  const [unsaved, setUnsaved] = useState(false)

  // ツールバーと配信名の表示。時計の帯だけは常に出しておき、切り替えの受け皿にする。
  const [chromeVisible, setChromeVisible] = useState(true)
  // 表示し直した時刻。値が変わることでタイマーを張り直す。
  // chromeVisible だけを見ていると、表示中にもう一度押しても状態が変わらず時間が延びない。
  const [revealedAt, setRevealedAt] = useState(() => Date.now())

  // URL をこのタブの状態にする。置換なので履歴は増えず、戻るボタンは
  // 実際に別のリンクを開いたときだけ効く。
  useEffect(() => {
    window.history.replaceState(null, '', stateUrl(window.location.pathname, { layout, videoIds }))

    // 最後に使ったセットとして控える。URL に何も付いていない状態で開いたときに使う。
    save({ videoIds, layout })
  }, [videoIds, layout])

  // 同じタブで別のリンクを開いたとき、ブラウザはハッシュだけの変化では読み込み直さない。
  // 戻る・進むでも同じなので、ここで追従する。
  // 自分の replaceState では hashchange は起きないため、取り違えは起きない。
  useEffect(() => {
    function applyHash() {
      const shared = decodeShareHash(window.location.hash)
      if (shared === null) return

      setVideoIds(shared.videoIds)
      setLayout(shared.layout)
      // URL と中身が一致している状態なので、控え漏れの警告は要らない
      setUnsaved(false)
    }

    window.addEventListener('hashchange', applyHash)
    return () => window.removeEventListener('hashchange', applyHash)
  }, [])

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

  /**
   * 配信のリストが変わったときの後始末。
   * 配信名を出し直すのは、今それが何なのかを知りたい場面だから。
   * 変更を起こしたイベント側でやるのは、effect で videoIds を監視すると
   * 描画のたびに state を書き換える形になるため。
   *
   * 分割数の変更ではここを通さない。2x2 と 3x3 の切り替えは見ながら頻繁にやる操作で、
   * 毎回リンクの控えを促すと警告に鈍感になる。失って痛いのは配信のリストの方。
   */
  function afterSetChange() {
    setUnsaved(true)
    revealChrome()
  }

  function addVideoIds(ids: string[]) {
    setVideoIds((current) => {
      // 同じ配信を 2 枠に出す意味がなく、React の key も衝突するため重複は捨てる
      const merged = [...current]
      for (const id of ids) {
        if (!merged.includes(id)) merged.push(id)
      }
      return merged.slice(0, MAX_PLAYERS)
    })
    afterSetChange()
  }

  function replaceVideoId(index: number, videoId: string) {
    setVideoIds((current) => {
      const next = [...current]
      next[index] = videoId
      return next
    })
    afterSetChange()
  }

  function removeVideoId(index: number) {
    // 詰めて持つので、後ろの枠が 1 つずつ繰り上がる
    setVideoIds((current) => current.filter((_, position) => position !== index))
    afterSetChange()
  }

  function clearAll() {
    setVideoIds([])
    afterSetChange()
  }

  /**
   * 枠を読み直す。セットは変わらないので URL もリンクの控えも関係ない。
   * 配信名も取り直す。配信が終わっていればタイトルが変わっているため。
   */
  function reloadVideo(videoId: string) {
    setReloads((current) => ({ ...current, [videoId]: (current[videoId] ?? 0) + 1 }))
    refresh(videoId)
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
        onReload={reloadVideo}
        onClear={clearAll}
        unsaved={unsaved}
        onSaved={() => setUnsaved(false)}
        playing={playing}
        onPlayingChange={setPlaying}
      />

      <WorldClock onToggle={toggleChrome} />
      <Grid
        videoIds={videoIds}
        layout={layout}
        info={info}
        reloads={reloads}
        playing={playing}
        showNumbers={editing}
        // 編集中は常に出す。どの枠が何かを確かめている場面なので消してはいけない。
        showCaptions={chromeVisible || editing}
      />
    </>
  )
}
