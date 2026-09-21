import { describe, expect, it } from 'vitest'
import { CITIES } from './cities'
import {
  cityTime,
  dayDifference,
  formatClock,
  formatDate,
  formatDayOffset,
  formatDuration,
  nextSunEvent,
  sameDate,
} from './sun'

function city(label: string) {
  const found = CITIES.find((candidate) => candidate.label === label)
  if (found === undefined) throw new Error(`未知の都市: ${label}`)
  return found
}

function minutes(clock: string): number {
  const [hour, minute] = clock.split(':').map(Number)
  return hour * 60 + minute
}

// 自分で計算式を書いている部分なので、暦の実測値と突き合わせる。
// 簡易式なので分単位の誤差は出る。許容は 4 分。
const TOLERANCE = 4

describe('日の出と日の入り', () => {
  it.each([
    // 基準の日時（UTC）, 都市, 日の出, 日の入り
    ['2026-09-21T03:00:00Z', 'TOKYO', '05:29', '17:44'],
    ['2026-09-21T03:00:00Z', 'LONDON', '06:47', '19:00'],
    ['2026-09-21T12:00:00Z', 'NEW YORK', '06:39', '18:52'],
    ['2026-12-21T03:00:00Z', 'TOKYO', '06:47', '16:32'],
    ['2026-12-21T12:00:00Z', 'LONDON', '08:04', '15:53'],
    ['2026-06-21T03:00:00Z', 'TOKYO', '04:25', '19:00'],
    ['2026-06-21T12:00:00Z', 'LONDON', '04:43', '21:21'],
    // 南半球は季節が逆になる。冬至に昼が長いこともここで確かめられる。
    ['2026-12-21T03:00:00Z', 'SYDNEY', '05:41', '20:06'],
  ])('%s %s', (iso, label, expectedSunrise, expectedSunset) => {
    const target = city(label)
    const result = cityTime(target.latitude, target.longitude, target.timeZone, new Date(iso))

    expect(result.sunrise).not.toBeNull()
    expect(result.sunset).not.toBeNull()

    const sunrise = minutes(formatClock(result.sunrise as number))
    const sunset = minutes(formatClock(result.sunset as number))

    expect(Math.abs(sunrise - minutes(expectedSunrise))).toBeLessThanOrEqual(TOLERANCE)
    expect(Math.abs(sunset - minutes(expectedSunset))).toBeLessThanOrEqual(TOLERANCE)
  })
})

describe('現地時刻', () => {
  // タイムゾーンのずれは Intl から導いている。夏時間の切り替わりを跨いでも
  // ブラウザ標準の変換と一致していることを確かめる。
  it.each([
    ['2026-03-07T12:00:00Z', 'NEW YORK'],
    ['2026-03-10T12:00:00Z', 'NEW YORK'],
    ['2026-11-03T12:00:00Z', 'NEW YORK'],
    ['2026-03-28T12:00:00Z', 'LONDON'],
    ['2026-03-31T12:00:00Z', 'LONDON'],
    ['2026-04-06T12:00:00Z', 'SYDNEY'],
    ['2026-10-05T12:00:00Z', 'SYDNEY'],
  ])('%s %s は Intl と一致する', (iso, label) => {
    const target = city(label)
    const at = new Date(iso)

    const mine = formatClock(cityTime(target.latitude, target.longitude, target.timeZone, at).hours)
    const reference = new Intl.DateTimeFormat('en-GB', {
      timeZone: target.timeZone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(at)

    expect(mine).toBe(reference)
  })
})

describe('昼夜の判定', () => {
  it('日の出と日の入りのあいだを昼とみなす', () => {
    const tokyo = city('TOKYO')

    // 日本時間の正午
    const noon = cityTime(tokyo.latitude, tokyo.longitude, tokyo.timeZone, new Date('2026-06-21T03:00:00Z'))
    expect(noon.isDay).toBe(true)

    // 日本時間の深夜 0 時
    const midnight = cityTime(tokyo.latitude, tokyo.longitude, tokyo.timeZone, new Date('2026-06-20T15:00:00Z'))
    expect(midnight.isDay).toBe(false)
  })
})

describe('formatClock', () => {
  it('小数時間を 2 桁の時計表記にする', () => {
    expect(formatClock(0)).toBe('00:00')
    expect(formatClock(5.5)).toBe('05:30')
    expect(formatClock(23.99)).toBe('23:59')
  })
})

describe('nextSunEvent', () => {
  const at = new Date('2026-09-21T02:00:00Z')

  it('一覧の中で最も早く境目を迎える都市を返す', () => {
    const event = nextSunEvent(CITIES, at)
    expect(event).not.toBeNull()

    // 各都市の日の出と日の入りまでの残り時間を独立に計算し、最小と一致することを見る
    const candidates: number[] = []
    for (const target of CITIES) {
      const time = cityTime(target.latitude, target.longitude, target.timeZone, at)
      for (const boundary of [time.sunrise, time.sunset]) {
        if (boundary === null) continue
        candidates.push(Math.round((((boundary - time.hours) % 24 + 24) % 24) * 60))
      }
    }

    expect(event?.minutesUntil).toBe(Math.min(...candidates))
  })

  it('残り時間は 24 時間の範囲に収まる', () => {
    const event = nextSunEvent(CITIES, at)
    expect(event?.minutesUntil).toBeGreaterThanOrEqual(0)
    expect(event?.minutesUntil).toBeLessThan(24 * 60)
  })

  it('都市が無ければ null', () => {
    expect(nextSunEvent([], at)).toBeNull()
  })

  it('返す種別は日の出か日の入りのどちらか', () => {
    expect(['sunrise', 'sunset']).toContain(nextSunEvent(CITIES, at)?.kind)
  })
})

describe('formatDuration', () => {
  it('時刻と見間違えないよう単位を付ける', () => {
    expect(formatDuration(0)).toBe('0m')
    expect(formatDuration(59)).toBe('59m')
    expect(formatDuration(60)).toBe('1h 0m')
    expect(formatDuration(95)).toBe('1h 35m')
    expect(formatDuration(725)).toBe('12h 5m')
  })
})

describe('現地の暦日', () => {
  // 日付ずれの表示はここが正しいことに全面的に依存する。
  // ブラウザ標準の変換と突き合わせて確かめる。
  it.each([
    // この瞬間、ロサンゼルスは前日になっている
    ['2026-09-21T04:38:00Z', 'LOS ANGELES'],
    ['2026-09-21T04:38:00Z', 'TOKYO'],
    ['2026-09-21T04:38:00Z', 'NEW YORK'],
    // 日付が変わる境目
    ['2026-09-21T14:59:00Z', 'TOKYO'],
    ['2026-09-21T15:01:00Z', 'TOKYO'],
    // 年をまたぐ
    ['2026-12-31T16:00:00Z', 'SYDNEY'],
    ['2027-01-01T04:00:00Z', 'LOS ANGELES'],
  ])('%s の %s は Intl と一致する', (iso, label) => {
    const target = city(label)
    const at = new Date(iso)

    const mine = formatDate(
      cityTime(target.latitude, target.longitude, target.timeZone, at).date,
    )
    // en-CA は ISO と同じ 2026-09-21 の形で返す
    const reference = new Intl.DateTimeFormat('en-CA', {
      timeZone: target.timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(at)

    expect(mine).toBe(reference)
  })

  it('東京が当日でもロサンゼルスは前日として扱われる', () => {
    const at = new Date('2026-09-21T04:38:00Z')
    const tokyo = city('TOKYO')
    const la = city('LOS ANGELES')

    const tokyoDate = cityTime(tokyo.latitude, tokyo.longitude, tokyo.timeZone, at).date
    const laDate = cityTime(la.latitude, la.longitude, la.timeZone, at).date

    expect(sameDate(tokyoDate, laDate)).toBe(false)
    expect(dayDifference(laDate, tokyoDate)).toBe(-1)
    expect(formatDayOffset(dayDifference(laDate, tokyoDate))).toBe('\u22121d')
  })
})

describe('日付の表記', () => {
  it('ISO 8601 の形で書き、月日は 0 詰めする', () => {
    expect(formatDate({ year: 2026, month: 9, day: 1 })).toBe('2026-09-01')
    expect(formatDate({ year: 2026, month: 12, day: 24 })).toBe('2026-12-24')
  })

  it('同じ日かどうかを年月日で比べる', () => {
    expect(sameDate({ year: 2026, month: 9, day: 21 }, { year: 2026, month: 9, day: 21 })).toBe(true)
    expect(sameDate({ year: 2026, month: 9, day: 21 }, { year: 2027, month: 9, day: 21 })).toBe(
      false,
    )
  })
})

describe('日付のずれ', () => {
  it('月や年をまたいでも日数で数える', () => {
    const base = { year: 2026, month: 9, day: 21 }
    expect(dayDifference({ year: 2026, month: 9, day: 20 }, base)).toBe(-1)
    expect(dayDifference({ year: 2026, month: 9, day: 22 }, base)).toBe(1)
    expect(dayDifference(base, base)).toBe(0)
    // 月末をまたぐ
    expect(dayDifference({ year: 2026, month: 9, day: 1 }, { year: 2026, month: 8, day: 31 })).toBe(1)
    // 年末をまたぐ
    expect(dayDifference({ year: 2027, month: 1, day: 1 }, { year: 2026, month: 12, day: 31 })).toBe(
      1,
    )
  })

  it('単位を付ける。時計の文脈で -1 だけだと UTC の時差に読めるため', () => {
    // マイナスは U+2212
    expect(formatDayOffset(-1)).toBe('\u22121d')
    expect(formatDayOffset(1)).toBe('+1d')
  })
})
