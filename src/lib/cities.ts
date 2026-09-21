export type City = {
  /** 表示名。欧文大文字で字間を空けて出す前提の短い名前にする。 */
  label: string
  /** 読み上げ用の名前。大文字だけの label をそのまま読ませたくないため別に持つ。 */
  name: string
  timeZone: string
  latitude: number
  longitude: number
}

// 経度の西から東へ並べる。左から右へ地球を横断する形になり、時差の関係が読み取りやすい。
// 増やしたり入れ替えたりするのはここだけ。
export const CITIES: City[] = [
  {
    label: 'LOS ANGELES',
    name: 'Los Angeles',
    timeZone: 'America/Los_Angeles',
    latitude: 34.05,
    longitude: -118.24,
  },
  {
    label: 'NEW YORK',
    name: 'New York',
    timeZone: 'America/New_York',
    latitude: 40.71,
    longitude: -74.01,
  },
  {
    label: 'LONDON',
    name: 'London',
    timeZone: 'Europe/London',
    latitude: 51.51,
    longitude: -0.13,
  },
  {
    label: 'DUBAI',
    name: 'Dubai',
    timeZone: 'Asia/Dubai',
    latitude: 25.2,
    longitude: 55.27,
  },
  {
    label: 'TOKYO',
    name: 'Tokyo',
    timeZone: 'Asia/Tokyo',
    latitude: 35.68,
    longitude: 139.69,
  },
  {
    label: 'SYDNEY',
    name: 'Sydney',
    timeZone: 'Australia/Sydney',
    latitude: -33.87,
    longitude: 151.21,
  },
]
