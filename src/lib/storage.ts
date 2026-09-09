import { LAYOUTS, MAX_PLAYERS, type Layout } from './layout'

// 保存形式を変えるときはキーの版を上げる。古い形式を読んで壊れるより作り直す方が安い。
const KEY = 'livewall.v1'

// 主に使うのが 9 分割なので初回もそこから始める
const DEFAULT_LAYOUT: Layout = 9

export type SavedState = {
  videoIds: string[]
  layout: Layout
}

const EMPTY: SavedState = { videoIds: [], layout: DEFAULT_LAYOUT }

export function load(): SavedState {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw === null) return EMPTY

    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return EMPTY

    const { videoIds, layout } = parsed as Partial<SavedState>
    return {
      videoIds: Array.isArray(videoIds)
        ? videoIds.filter((id): id is string => typeof id === 'string').slice(0, MAX_PLAYERS)
        : [],
      layout: isLayout(layout) ? layout : DEFAULT_LAYOUT,
    }
  } catch {
    // JSON が壊れている、localStorage が使えない（プライベートモード等）。
    // どちらも起動不能にする理由はないので空の状態で始める。
    return EMPTY
  }
}

export function save(state: SavedState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    // 保存に失敗しても再生自体は続けられるので握りつぶす
  }
}

function isLayout(value: unknown): value is Layout {
  return LAYOUTS.some((layout) => layout === value)
}
