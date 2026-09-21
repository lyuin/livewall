import { describe, expect, it } from 'vitest'
import { CITIES, type City } from './cities'
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

// 座標はここに持つ。天文計算の正しさは「アプリがどの都市を表示するか」とは無関係なので、
// 都市一覧を入れ替えてもこのテストが壊れないようにしておく。
const PLACES = {
  tokyo: { label: 'TOKYO', name: 'Tokyo', timeZone: 'Asia/Tokyo', latitude: 35.68, longitude: 139.69 },
  london: {
    label: 'LONDON',
    name: 'London',
    timeZone: 'Europe/London',
    latitude: 51.51,
    longitude: -0.13,
  },
  paris: { label: 'PARIS', name: 'Paris', timeZone: 'Europe/Paris', latitude: 48.86, longitude: 2.35 },
  newYork: {
    label: 'NEW YORK',
    name: 'New York',
    timeZone: 'America/New_York',
    latitude: 40.71,
    longitude: -74.01,
  },
  losAngeles: {
    label: 'LOS ANGELES',
    name: 'Los Angeles',
    timeZone: 'America/Los_Angeles',
    latitude: 34.05,
    longitude: -118.24,
  },
  sydney: {
    label: 'SYDNEY',
    name: 'Sydney',
    timeZone: 'Australia/Sydney',
    latitude: -33.87,
    longitude: 151.21,
  },
} satisfies Record<string, City>

function at(place: City, iso: string) {
  return cityTime(place.latitude, place.longitude, place.timeZone, new Date(iso))
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
    // 基準の日時（UTC）, 場所, 日の出, 日の入り
    ['2026-09-21T03:00:00Z', PLACES.tokyo, '05:29', '17:44'],
    ['2026-09-21T03:00:00Z', PLACES.london, '06:47', '19:00'],
    ['2026-09-21T12:00:00Z', PLACES.newYork, '06:39', '18:52'],
    ['2026-12-21T03:00:00Z', PLACES.tokyo, '06:47', '16:32'],
    ['2026-12-21T12:00:00Z', PLACES.london, '08:04', '15:53'],
    ['2026-06-21T03:00:00Z', PLACES.tokyo, '04:25', '19:00'],
    ['2026-06-21T12:00:00Z', PLACES.london, '04:43', '21:21'],
    // 南半球は季節が逆になる。冬至に昼が長いこともここで確かめられる。
    ['2026-12-21T03:00:00Z', PLACES.sydney, '05:41', '20:06'],
  ])('$1 の %s', (iso, place, expectedSunrise, expectedSunset) => {
    const result = at(place, iso)

    expect(result.sunrise).not.toBeNull()
    expect(result.sunset).not.toBeNull()

    const sunrise = minutes(formatClock(result.sunrise as number))
    const sunset = minutes(formatClock(result.sunset as number))

    expect(Math.abs(sunrise - minutes(expectedSunrise))).toBeLessThanOrEqual(TOLERANCE)
    expect(Math.abs(sunset - minutes(expectedSunset))).toBeLessThanOrEqual(TOLERANCE)
  })

  it('経度が近い都市は日の出もほぼ同じになる', () => {
    // ロンドンとパリは経度が 2.5 度差しかないので、太陽の動きは 10 分程度しか違わない。
    // 時計が 1 時間違うのはタイムゾーンの取り決めによるもので、地理的な差ではない。
    const iso = '2026-09-21T03:00:00Z'
    const londonUtcSunrise = (at(PLACES.london, iso).sunrise as number) - 1 // BST は UTC+1
    const parisUtcSunrise = (at(PLACES.paris, iso).sunrise as number) - 2 // CEST は UTC+2

    expect(Math.abs(londonUtcSunrise - parisUtcSunrise) * 60).toBeLessThan(15)
  })
})

describe('現地時刻', () => {
  // タイムゾーンのずれは Intl から導いている。夏時間の切り替わりを跨いでも
  // ブラウザ標準の変換と一致していることを確かめる。
  it.each([
    ['2026-03-07T12:00:00Z', PLACES.newYork],
    ['2026-03-10T12:00:00Z', PLACES.newYork],
    ['2026-11-03T12:00:00Z', PLACES.newYork],
    ['2026-03-28T12:00:00Z', PLACES.london],
    ['2026-03-31T12:00:00Z', PLACES.london],
    ['2026-03-31T12:00:00Z', PLACES.paris],
    ['2026-04-06T12:00:00Z', PLACES.sydney],
    ['2026-10-05T12:00:00Z', PLACES.sydney],
  ])('%s の %s は Intl と一致する', (iso, place) => {
    const target = new Date(iso)

    const mine = formatClock(at(place, iso).hours)
    const reference = new Intl.DateTimeFormat('en-GB', {
      timeZone: place.timeZone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(target)

    expect(mine).toBe(reference)
  })
})

describe('昼夜の判定', () => {
  it('日の出と日の入りのあいだを昼とみなす', () => {
    // 日本時間の正午
    expect(at(PLACES.tokyo, '2026-06-21T03:00:00Z').isDay).toBe(true)
    // 日本時間の深夜 0 時
    expect(at(PLACES.tokyo, '2026-06-20T15:00:00Z').isDay).toBe(false)
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
  const now = new Date('2026-09-21T02:00:00Z')

  it('一覧の中で最も早く境目を迎える都市を返す', () => {
    const event = nextSunEvent(CITIES, now)
    expect(event).not.toBeNull()

    // 各都市の日の出と日の入りまでの残り時間を独立に計算し、最小と一致することを見る
    const candidates: number[] = []
    for (const city of CITIES) {
      const time = cityTime(city.latitude, city.longitude, city.timeZone, now)
      for (const boundary of [time.sunrise, time.sunset]) {
        if (boundary === null) continue
        candidates.push(Math.round(((((boundary - time.hours) % 24) + 24) % 24) * 60))
      }
    }

    expect(event?.minutesUntil).toBe(Math.min(...candidates))
  })

  it('残り時間は 24 時間の範囲に収まる', () => {
    const event = nextSunEvent(CITIES, now)
    expect(event?.minutesUntil).toBeGreaterThanOrEqual(0)
    expect(event?.minutesUntil).toBeLessThan(24 * 60)
  })

  it('都市が無ければ null', () => {
    expect(nextSunEvent([], now)).toBeNull()
  })

  it('返す種別は日の出か日の入りのどちらか', () => {
    expect(['sunrise', 'sunset']).toContain(nextSunEvent(CITIES, now)?.kind)
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
    ['2026-09-21T04:38:00Z', PLACES.losAngeles],
    ['2026-09-21T04:38:00Z', PLACES.tokyo],
    ['2026-09-21T04:38:00Z', PLACES.newYork],
    // 日付が変わる境目
    ['2026-09-21T14:59:00Z', PLACES.tokyo],
    ['2026-09-21T15:01:00Z', PLACES.tokyo],
    // 年をまたぐ
    ['2026-12-31T16:00:00Z', PLACES.sydney],
    ['2027-01-01T04:00:00Z', PLACES.losAngeles],
  ])('%s の %s は Intl と一致する', (iso, place) => {
    const mine = formatDate(at(place, iso).date)

    // en-CA は ISO と同じ 2026-09-21 の形で返す
    const reference = new Intl.DateTimeFormat('en-CA', {
      timeZone: place.timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date(iso))

    expect(mine).toBe(reference)
  })

  it('東京が当日でもロサンゼルスは前日として扱われる', () => {
    const iso = '2026-09-21T04:38:00Z'
    const tokyoDate = at(PLACES.tokyo, iso).date
    const laDate = at(PLACES.losAngeles, iso).date

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
