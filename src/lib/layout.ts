// 選べる分割数。6(3x2) は iPad の実機確認で縦横比が実用にならなかったため廃止した。
// 1 は実質フォーカスモード（当面作らない）、2 は使う場面が想像しづらいので入れていない。
export const LAYOUTS = [4, 9] as const

export type Layout = (typeof LAYOUTS)[number]

export const MAX_PLAYERS = 9

// 16:9 のセルを並べたときの列数。4 → 2x2, 9 → 3x3。
// どちらもグリッド全体が 16:9 になるので、セルの縦横比を崩さずに並べられる。
export const COLUMNS: Record<Layout, number> = { 4: 2, 9: 3 }

/**
 * ボタンに出す表記。格子の形そのものを示すので言語に依存せず、説明も要らない。
 */
export function layoutLabel(layout: Layout): string {
  const columns = COLUMNS[layout]
  return `${columns} × ${layout / columns}`
}
