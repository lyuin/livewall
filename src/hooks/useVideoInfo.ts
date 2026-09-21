import { useCallback, useEffect, useState } from 'react'
import { fetchVideoInfo, type InfoMap } from '../lib/oembed'
import { loadVideoInfoCache, rememberVideoInfo } from '../lib/videoInfoCache'

type Result = {
  info: InfoMap
  /** 1 件だけ取り直す。配信が終わっているとタイトルが変わるため、枠の読み直しと合わせて使う。 */
  refresh: (videoId: string) => void
}

/**
 * 動画 ID からタイトルとチャンネル名を引く。
 * 保存済みのものは問い合わせず、足りないぶんだけ取りに行く。
 */
export function useVideoInfo(videoIds: string[]): Result {
  const [info, setInfo] = useState<InfoMap>(loadVideoInfoCache)

  // 「もう投げた ID」の集合。保存済みのぶんを初期値にしておく。
  // 取得済みかどうかを info から判断すると effect の依存に info が必要になり、
  // 1 件取得するたびに effect が再実行されて止まらなくなる。
  const [requested] = useState(() => new Set(Object.keys(info)))

  // 取り直しの合図。集合を書き換えただけでは effect が動かないため、
  // 依存に入れられる値を別に持つ。
  const [refreshCount, setRefreshCount] = useState(0)

  useEffect(() => {
    const pending = videoIds.filter((videoId) => !requested.has(videoId))
    if (pending.length === 0) return

    for (const videoId of pending) requested.add(videoId)

    let cancelled = false

    void Promise.all(
      pending.map(async (videoId) => {
        const result = await fetchVideoInfo(videoId)
        if (cancelled) return

        // 成功だけ保存する。通信失敗を覚えると次回も失敗のまま表示され続ける。
        // ただし同じ表示のあいだは再試行しない。次に開いたときに取り直す。
        if (result.status === 'ok') rememberVideoInfo(videoId, result)

        setInfo((current) => ({ ...current, [videoId]: result }))
      }),
    )

    return () => {
      cancelled = true
    }
  }, [videoIds, requested, refreshCount])

  const refresh = useCallback(
    (videoId: string) => {
      requested.delete(videoId)
      setInfo((current) => {
        const next = { ...current }
        delete next[videoId]
        return next
      })
      setRefreshCount((count) => count + 1)
    },
    [requested],
  )

  return { info, refresh }
}
