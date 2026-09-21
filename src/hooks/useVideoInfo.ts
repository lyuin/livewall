import { useEffect, useRef, useState } from 'react'
import { fetchVideoInfo, type InfoMap } from '../lib/oembed'
import { loadVideoInfoCache, rememberVideoInfo } from '../lib/videoInfoCache'

/**
 * 動画 ID からタイトルとチャンネル名を引く。
 * 保存済みのものは問い合わせず、足りないぶんだけ取りに行く。
 */
export function useVideoInfo(videoIds: string[]): InfoMap {
  const [info, setInfo] = useState<InfoMap>(loadVideoInfoCache)

  // 問い合わせ済みの ID。state を見て判断すると effect の依存に info が必要になり、
  // 取得するたびに effect が再実行されて止まらなくなる。
  const requested = useRef(new Set<string>())

  useEffect(() => {
    const pending = videoIds.filter(
      (videoId) => !requested.current.has(videoId) && info[videoId] === undefined,
    )
    if (pending.length === 0) return

    for (const videoId of pending) requested.current.add(videoId)

    let cancelled = false

    void Promise.all(
      pending.map(async (videoId) => {
        const result = await fetchVideoInfo(videoId)
        if (cancelled) return

        // 成功だけ保存する。通信失敗を覚えると次回も失敗のまま表示され続ける。
        if (result.status === 'ok') rememberVideoInfo(videoId, result)

        setInfo((current) => ({ ...current, [videoId]: result }))
      }),
    )

    return () => {
      cancelled = true
    }
    // info は初回の保存済みデータを読むためだけに使うので依存に入れない。
    // 入れると取得するたびに effect が再実行されて止まらなくなる。
  }, [videoIds])

  return info
}
