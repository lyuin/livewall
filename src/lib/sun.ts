// 日の出・日の入りと現地時刻を求める。
// すべてブラウザ内の計算で完結する。外部サービスも API キーも使わない。

const DEGREES = Math.PI / 180

// ユリウス日と Unix 時間の差。1970-01-01T00:00:00Z のユリウス日。
const UNIX_EPOCH_JULIAN = 2440587.5

// J2000.0（2000-01-01T12:00:00Z）のユリウス日。太陽位置の式の基準。
const J2000 = 2451545

// 太陽の上端が地平線にかかる位置。大気差と太陽の視半径を含んだ慣例値。
const SUNRISE_ALTITUDE = -0.833

const HOURS_PER_DAY = 24
const MS_PER_DAY = 86_400_000

export type CityTime = {
  /** 現地時刻。0 以上 24 未満の小数時間 */
  hours: number
  /** 現地の日の出。極夜・白夜では null */
  sunrise: number | null
  /** 現地の日の入り。極夜・白夜では null */
  sunset: number | null
  isDay: boolean
}

export function cityTime(
  latitude: number,
  longitude: number,
  timeZone: string,
  at: Date,
): CityTime {
  const offset = offsetMinutes(timeZone, at)
  const hours = toLocalHours(at.getTime(), offset)
  const { sunrise, sunset } = sunTimes(latitude, longitude, at, offset)

  return { hours, sunrise, sunset, isDay: isDaylight(hours, sunrise, sunset) }
}

/**
 * タイムゾーンの UTC からのずれを分で返す。
 * Intl に同じ瞬間を現地の暦として書かせ、それを UTC として読み直した差を取る。
 * 夏時間もこの方法なら自動的に反映される。
 */
function offsetMinutes(timeZone: string, at: Date): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(at)

  const read = (type: string): number => Number(parts.find((part) => part.type === type)?.value)

  // hour12: false は 0 時を 24 と返す実装があるため丸める
  const asUtc = Date.UTC(
    read('year'),
    read('month') - 1,
    read('day'),
    read('hour') % HOURS_PER_DAY,
    read('minute'),
    read('second'),
  )

  // at 側のミリ秒を落として秒単位で比べる
  const truncated = Math.floor(at.getTime() / 1000) * 1000
  return Math.round((asUtc - truncated) / 60_000)
}

/**
 * 日の出・日の入りを求める（sunrise equation の標準的な近似）。
 * 数分の誤差は出るが、昼夜の帯を描くには十分な精度。
 */
function sunTimes(
  latitude: number,
  longitude: number,
  at: Date,
  offset: number,
): { sunrise: number | null; sunset: number | null } {
  const julian = at.getTime() / MS_PER_DAY + UNIX_EPOCH_JULIAN

  // 対象の日を 1 日単位で確定させる
  const day = Math.round(julian - J2000 + 0.0008)

  // 経度のぶんだけずらした平均太陽時
  const meanSolarTime = day - longitude / 360

  // 太陽の平均近点角
  const meanAnomaly = (357.5291 + 0.98560028 * meanSolarTime) % 360
  const meanAnomalyRad = meanAnomaly * DEGREES

  // 軌道が円でないことによる補正
  const center =
    1.9148 * Math.sin(meanAnomalyRad) +
    0.02 * Math.sin(2 * meanAnomalyRad) +
    0.0003 * Math.sin(3 * meanAnomalyRad)

  // 黄道座標での太陽の位置
  const eclipticLongitude = (meanAnomaly + center + 180 + 102.9372) % 360
  const eclipticRad = eclipticLongitude * DEGREES

  // 太陽が真南に来る時刻
  const transit =
    J2000 + meanSolarTime + 0.0053 * Math.sin(meanAnomalyRad) - 0.0069 * Math.sin(2 * eclipticRad)

  // 赤緯。地軸の傾き 23.4397 度から求める
  const declination = Math.asin(Math.sin(eclipticRad) * Math.sin(23.4397 * DEGREES))

  const latitudeRad = latitude * DEGREES
  const hourAngleCos =
    (Math.sin(SUNRISE_ALTITUDE * DEGREES) - Math.sin(latitudeRad) * Math.sin(declination)) /
    (Math.cos(latitudeRad) * Math.cos(declination))

  // 絶対値が 1 を超えるのは極夜（太陽が昇らない）か白夜（沈まない）
  if (hourAngleCos > 1 || hourAngleCos < -1) return { sunrise: null, sunset: null }

  const hourAngle = Math.acos(hourAngleCos) / DEGREES

  return {
    sunrise: julianToLocalHours(transit - hourAngle / 360, offset),
    sunset: julianToLocalHours(transit + hourAngle / 360, offset),
  }
}

function julianToLocalHours(julian: number, offset: number): number {
  return toLocalHours((julian - UNIX_EPOCH_JULIAN) * MS_PER_DAY, offset)
}

function toLocalHours(epochMs: number, offset: number): number {
  const local = new Date(epochMs + offset * 60_000)
  return local.getUTCHours() + local.getUTCMinutes() / 60 + local.getUTCSeconds() / 3600
}

function isDaylight(hours: number, sunrise: number | null, sunset: number | null): boolean {
  // 極夜・白夜。太陽が沈まないなら常に昼、昇らないなら常に夜とみなす。
  // 区別の手がかりが無いので、緯度が高い都市を並べる場合はここを見直す必要がある。
  if (sunrise === null || sunset === null) return false

  // 日の入りが日の出より前に来る（現地の暦日をまたぐ）場合がある
  if (sunrise <= sunset) return hours >= sunrise && hours < sunset
  return hours >= sunrise || hours < sunset
}

export function formatClock(hours: number): string {
  const whole = Math.floor(hours) % HOURS_PER_DAY
  const minutes = Math.floor((hours - Math.floor(hours)) * 60)
  return `${String(whole).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}
