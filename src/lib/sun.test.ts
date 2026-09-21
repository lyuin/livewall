import { describe, expect, it } from 'vitest'
import { CITIES } from './cities'
import { cityTime, formatClock } from './sun'

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
