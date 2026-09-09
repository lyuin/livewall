import { useEffect, useState } from 'react'
import Grid from './components/Grid'
import Toolbar from './components/Toolbar'
import { MAX_PLAYERS, type Layout } from './lib/layout'
import { load, save } from './lib/storage'

export default function App() {
  // localStorage は初回描画のときだけ読む
  const [initial] = useState(load)
  const [videoIds, setVideoIds] = useState<string[]>(initial.videoIds)
  const [layout, setLayout] = useState<Layout>(initial.layout)

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

  return (
    <>
      <Toolbar
        layout={layout}
        count={videoIds.length}
        onLayoutChange={setLayout}
        onAdd={addVideoIds}
        onClear={() => setVideoIds([])}
      />
      <Grid videoIds={videoIds} layout={layout} />
    </>
  )
}
