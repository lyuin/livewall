// 選べる分割数。1 と 2 は使う場面が想像しづらく、1 は実質フォーカスモード（当面作らない）
// なので、主に使う 4 / 6 / 9 に絞っている。
export const LAYOUTS = [4, 6, 9] as const

export type Layout = (typeof LAYOUTS)[number]

export const MAX_PLAYERS = 9

// 16:9 のセルを並べたときの列数。4 → 2x2, 6 → 3x2, 9 → 3x3。
// 4 と 9 は画面（16:9）にちょうど収まるが、6 は上下に黒帯が出る。
export const COLUMNS: Record<Layout, number> = { 4: 2, 6: 3, 9: 3 }
