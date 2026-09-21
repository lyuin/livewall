import { describe, expect, it } from 'vitest'
import { extractVideoId, extractVideoIds, isVideoId, watchUrl } from './youtube'

// 実在しない合成 ID を使う。リポジトリに実際の URL や動画 ID を残さないため。
const ID = 'AbCdEfGh_-1'
const OTHER = 'zzzzzzzzzzz'

describe('extractVideoId', () => {
  it.each([
    `https://www.youtube.com/watch?v=${ID}`,
    `https://youtube.com/watch?v=${ID}&t=30s`,
    `https://m.youtube.com/watch?v=${ID}`,
    `https://music.youtube.com/watch?v=${ID}`,
    `https://youtu.be/${ID}`,
    `https://youtu.be/${ID}?si=xxxx`,
    `https://www.youtube.com/live/${ID}`,
    `https://www.youtube.com/live/${ID}?feature=share`,
    `https://www.youtube.com/embed/${ID}`,
    `https://www.youtube.com/shorts/${ID}`,
  ])('URL から取り出す: %s', (input) => {
    expect(extractVideoId(input)).toBe(ID)
  })

  it('スキームが無くても読む', () => {
    expect(extractVideoId(`www.youtube.com/watch?v=${ID}`)).toBe(ID)
    expect(extractVideoId(`youtu.be/${ID}`)).toBe(ID)
  })

  it('ID 直打ちと前後の空白を受ける', () => {
    expect(extractVideoId(ID)).toBe(ID)
    expect(extractVideoId(`  ${ID}  `)).toBe(ID)
  })

  it.each([
    ['空文字', ''],
    ['空白だけ', '   '],
    ['YouTube 以外', 'https://vimeo.com/123456789'],
    ['チャンネル', 'https://www.youtube.com/@somechannel'],
    ['11 文字でない', 'https://www.youtube.com/watch?v=tooshort'],
    ['ID が無い', 'https://www.youtube.com/'],
    ['URL でない', 'not a url at all'],
    ['使えない文字', `https://www.youtube.com/live/${'!'.repeat(11)}`],
  ])('読めないものは null: %s', (_label, input) => {
    expect(extractVideoId(input)).toBeNull()
  })
})

describe('extractVideoIds', () => {
  it('改行区切りをまとめて読み、重複を除き、読めない行を報せる', () => {
    const result = extractVideoIds(
      [
        `https://youtu.be/${ID}`,
        '',
        // 同じ配信は 1 つだけ残す
        `https://www.youtube.com/watch?v=${ID}`,
        'garbage line',
        `https://www.youtube.com/live/${OTHER}`,
      ].join('\n'),
    )

    expect(result.ids).toEqual([ID, OTHER])
    expect(result.invalid).toEqual(['garbage line'])
  })

  it('空文字からは何も出さない', () => {
    expect(extractVideoIds('')).toEqual({ ids: [], invalid: [] })
  })
})

describe('isVideoId', () => {
  it('11 文字の英数字とハイフンとアンダースコアだけ通す', () => {
    expect(isVideoId(ID)).toBe(true)
    expect(isVideoId('short')).toBe(false)
    expect(isVideoId('twelvechars1')).toBe(false)
    expect(isVideoId('!!!!!!!!!!!')).toBe(false)
  })
})

describe('watchUrl', () => {
  it('ID から視聴用の URL を組み立てる', () => {
    expect(watchUrl(ID)).toBe(`https://www.youtube.com/watch?v=${ID}`)
  })
})
