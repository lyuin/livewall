import { useEffect, useState } from 'react'
import { fetchVideoInfo, type InfoMap } from '../lib/oembed'
import { loadVideoInfoCache, rememberVideoInfo } from '../lib/videoInfoCache'

/**
 * 動画 ID からタイトルとチャンネル名を引く。
 * 保存済みのものは問い合わせず、足りないぶんだけ取りに行く。
 */
export function useVideoInfo(videoIds: string[]): InfoMap {
  const [info, setInfo] = useState<InfoMap>(loadVideoInfoCache)

  // 「もう投げた ID」の集合。保存済みのぶんを初期値にしておく。
  // 取得済みかどうかを info から判断すると effect の依存に info が必要になり、
  // 1 件取得するたびに effect が再実行されて止まらなくなる。
  const [requested] = useState(() => new Set(Object.keys(info)))

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
  }, [videoIds, requested])

  return info
}
