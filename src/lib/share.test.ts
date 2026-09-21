import { describe, expect, it } from 'vitest'
import { decodeShareHash, encodeShareHash, stateUrl } from './share'

// 実在しない合成 ID を使う。リポジトリに実際の URL や動画 ID を残さないため。
const A = 'AAAAAAAAAAA'
const B = 'BBBBBBBBBBB'
const C = 'ccccccccccc'
const D = 'dd_-ddddddd'
const NINE = [A, B, C, D, 'EEEEEEEEEEE', 'FFFFFFFFFFF', 'GGGGGGGGGGG', 'HHHHHHHHHHH', 'IIIIIIIIIII']

describe('共有リンクの往復', () => {
  it.each([
    [4 as const, [A, B, C, D]],
    [9 as const, NINE],
    [9 as const, [A]],
  ])('分割数 %i / %i 本', (layout, videoIds) => {
    const decoded = decodeShareHash(encodeShareHash({ layout, videoIds }))
    expect(decoded).toEqual({ layout, videoIds })
  })

  it('動画 ID は 11 文字固定なので区切り文字を挟まない', () => {
    expect(encodeShareHash({ layout: 4, videoIds: [A, B] })).toBe(`#1.4.${A}${B}`)
  })

  it('9 本でも 110 文字を超えない', () => {
    // ID はほぼランダムな英数字で圧縮の余地が無く、この長さが下限になる。
    // 縮めるには対応表を持つサーバーが必要なので、長さが伸びていないことだけ見る。
    expect(encodeShareHash({ layout: 9, videoIds: NINE }).length).toBeLessThanOrEqual(110)
  })
})

describe('decodeShareHash', () => {
  it('# が無くても読む', () => {
    expect(decodeShareHash(`1.4.${A}`)?.videoIds).toEqual([A])
  })

  it('重複した ID を落とす', () => {
    expect(decodeShareHash(`#1.4.${A}${A}${B}`)?.videoIds).toEqual([A, B])
  })

  it.each([
    ['空文字', ''],
    ['# だけ', '#'],
    ['区切りが足りない', '#1.9'],
    ['知らない版', `#2.9.${A}`],
    ['廃止した分割数', `#1.6.${A}`],
    ['存在しない分割数', `#1.5.${A}`],
    ['11 の倍数でない', `#1.9.${A}xy`],
    ['使えない文字', `#1.9.${'!'.repeat(11)}`],
    ['上限を超える 10 本', `#1.9.${A.repeat(10)}`],
    ['ID が空', '#1.9.'],
  ])('壊れた入力は null: %s', (_label, hash) => {
    expect(decodeShareHash(hash)).toBeNull()
  })
})

describe('stateUrl', () => {
  it('セットが入っていればハッシュを付ける', () => {
    expect(stateUrl('/livewall/', { layout: 4, videoIds: [A, B] })).toBe(`/livewall/#1.4.${A}${B}`)
  })

  it('空のセットではハッシュを付けない', () => {
    // #1.9. は動画 ID が 0 個で形式として読めないため、付けても次に開いたときに捨てられる
    expect(stateUrl('/livewall/', { layout: 9, videoIds: [] })).toBe('/livewall/')
    expect(decodeShareHash('#1.9.')).toBeNull()
  })
})
