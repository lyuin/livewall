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
    // ロンドン（経度 -0.13）とはわずか 2.5 度差で、24 時間の帯の上では同じ位置。
    // 差し替えてもヨーロッパの枠としての釣り合いは変わらない。
    label: 'PARIS',
    name: 'Paris',
    timeZone: 'Europe/Paris',
    latitude: 48.86,
    longitude: 2.35,
  },
  {
    label: 'DUBAI',
    name: 'Dubai',
    timeZone: 'Asia/Dubai',
    latitude: 25.2,
    longitude: 55.27,
  },
  {
    // ドバイ（55 度）と東京（140 度）の 85 度の隙間を埋める。
    // 赤道直下なので昼の長さが年間ほぼ 12 時間で変わらず、季節で大きく揺れる
    // パリと並ぶと帯の形の違いがそのまま緯度の違いになる。
    label: 'SINGAPORE',
    name: 'Singapore',
    timeZone: 'Asia/Singapore',
    latitude: 1.35,
    longitude: 103.82,
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
