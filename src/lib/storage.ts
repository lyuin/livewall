import { LAYOUTS, MAX_PLAYERS, type Layout } from './layout'

// 保存形式を変えるときはキーの版を上げる。古い形式を読んで壊れるより作り直す方が安い。
const KEY = 'livewall.v2'

// v1 は { videoIds, layout } の平らな形だった。既存のデータを失わないよう読み取りだけ残す。
const LEGACY_KEY = 'livewall.v1'

const FORMAT_VERSION = 1

// 主に使うのが 9 分割なので初回もそこから始める
const DEFAULT_LAYOUT: Layout = 9

/**
 * 画面に出している 1 セット分。今はこれが常に 1 つだけ存在する。
 */
export type ActiveSet = {
  videoIds: string[]
  layout: Layout
}

type PlayerSet = ActiveSet & {
  /** Phase 4 の名前付きセット用。今は常に空文字。 */
  name: string
}

/**
 * localStorage に書く形。セットを複数持てる器にしてあるが、今は 1 つしか入れない。
 * 後から平らな形を配列に変えると保存済みデータの変換が必要になるため、先に器を広くしておく。
 */
type StoredFile = {
  version: number
  sets: PlayerSet[]
  activeSet: number
}

const EMPTY: ActiveSet = { videoIds: [], layout: DEFAULT_LAYOUT }

export function load(): ActiveSet {
  try {
    const current = readJson(KEY)
    if (current !== null) {
      const file = current as Partial<StoredFile>
      const sets = Array.isArray(file.sets) ? file.sets : []
      const index = typeof file.activeSet === 'number' ? file.activeSet : 0
      const active: unknown = sets[index] ?? sets[0]
      if (active !== undefined) return sanitize(active)
    }

    // v1 からの引き継ぎ。v1 のキーは消さずに残す（万一ここに不具合があっても元データを失わない）。
    const legacy = readJson(LEGACY_KEY)
    if (legacy !== null) return sanitize(legacy)

    return EMPTY
  } catch {
    // JSON が壊れている、localStorage が使えない（プライベートモード等）。
    // どちらも起動不能にする理由はないので空の状態で始める。
    return EMPTY
  }
}

export function save(active: ActiveSet): void {
  const file: StoredFile = {
    version: FORMAT_VERSION,
    // Phase 4 で複数セットになったら、ここで他のセットを保持したまま差し替える
    sets: [{ name: '', layout: active.layout, videoIds: active.videoIds }],
    activeSet: 0,
  }
  try {
    localStorage.setItem(KEY, JSON.stringify(file))
  } catch {
    // 保存に失敗しても再生自体は続けられるので握りつぶす
  }
}

function readJson(key: string): unknown {
  const raw = localStorage.getItem(key)
  if (raw === null) return null

  const parsed: unknown = JSON.parse(raw)
  if (typeof parsed !== 'object' || parsed === null) return null
  return parsed
}

function sanitize(value: unknown): ActiveSet {
  const { videoIds, layout } = value as Partial<PlayerSet>
  return {
    videoIds: Array.isArray(videoIds)
      ? videoIds.filter((id): id is string => typeof id === 'string').slice(0, MAX_PLAYERS)
      : [],
    layout: isLayout(layout) ? layout : DEFAULT_LAYOUT,
  }
}

// 廃止した分割数（6 など）が保存されていた場合もここで弾かれ、既定値に落ちる
function isLayout(value: unknown): value is Layout {
  return LAYOUTS.some((layout) => layout === value)
}
