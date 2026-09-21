import { useEffect, useState } from 'react'
import { CITIES, type City } from '../lib/cities'
import {
  cityTime,
  formatClock,
  formatCountdown,
  nextSunEvent,
  type CityTime,
} from '../lib/sun'

// 秒は出さないので 10 秒ごとで足りる。9 本再生中の負荷を増やしたくない。
const TICK_MS = 10_000

const NIGHT = '#101a2e'
const TWILIGHT = '#c4703a'
const DAY = '#9dc3e6'

// 日の出・日の入りの前後にこの時間だけグラデーションをかけ、薄明を表す
const TWILIGHT_HOURS = 0.8

// 端に出す日付。曜日を入れるのは、都市ごとに日付が 1 日ずれることを読み取れるようにするため。
// 3 つに分けているのは、並び順を自分で決めるためと、9 月だけ 4 文字（Sept）になる
// ロケールを避けて月名の幅を揃えるため。
const WEEKDAY_FORMAT = new Intl.DateTimeFormat('en-US', { weekday: 'short' })
const DAY_FORMAT = new Intl.DateTimeFormat('en-US', { day: '2-digit' })
const MONTH_FORMAT = new Intl.DateTimeFormat('en-US', { month: 'short' })

function formatDate(at: Date): string {
  return `${WEEKDAY_FORMAT.format(at)} ${DAY_FORMAT.format(at)} ${MONTH_FORMAT.format(at)}`
}

type Props = {
  /** 配信名を再表示する。映像をタップするとプレイヤーが反応するため、
      iframe の外にあるこの帯が受け皿になる。 */
  onReveal: () => void
}

export default function WorldClock({ onReveal }: Props) {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), TICK_MS)
    return () => window.clearInterval(timer)
  }, [])

  const next = nextSunEvent(CITIES, now)

  return (
    <button type="button" className="world" onClick={onReveal} aria-label="Show stream names">
      <div className="edge">
        <div className="edge__label">Today</div>
        <div className="edge__value">{formatDate(now)}</div>
      </div>

      <div className="cities">
        {CITIES.map((city) => (
          <CityClock key={city.timeZone} city={city} now={now} />
        ))}
      </div>

      <div className="edge edge--right">
        <div className="edge__label">Next</div>
        {next === null ? (
          <div className="edge__value">—</div>
        ) : (
          <div
            className="edge__value"
            aria-label={`${next.city.name} ${next.kind} in ${formatCountdown(next.minutesUntil)}`}
          >
            {next.city.label}{' '}
            {/* 上向きが日の出、下向きが日の入り。意味は読み上げ用の文で補う。 */}
            <span aria-hidden="true">{next.kind === 'sunrise' ? '↑' : '↓'}</span>{' '}
            {formatCountdown(next.minutesUntil)}
          </div>
        )}
      </div>
    </button>
  )
}

function CityClock({ city, now }: { city: City; now: Date }) {
  const time = cityTime(city.latitude, city.longitude, city.timeZone, now)
  const clock = formatClock(time.hours)

  return (
    <div className={`city ${time.isDay ? 'city--day' : 'city--night'}`}>
      <div className="city__name">{city.label}</div>

      {/* 昼夜を色だけに担わせないよう、読み上げ用の文にも入れる */}
      <div
        className="city__time"
        aria-label={`${city.name} ${clock} ${time.isDay ? 'day' : 'night'}`}
      >
        {clock}
      </div>

      {/* 24 時間を 1 本の帯にしたもの。色が変わる位置が日の出と日の入りで、
          帯の形そのものが季節と緯度による昼の長さを表す。 */}
      <div className="city__arc" style={{ background: arcGradient(time) }} aria-hidden="true">
        <span className="city__now" style={{ left: `${percent(time.hours)}%` }} />
      </div>
    </div>
  )
}

function arcGradient({ sunrise, sunset }: CityTime): string {
  // 極夜・白夜では日の出・日の入りが存在しないので、単色にする
  if (sunrise === null || sunset === null) return NIGHT

  const stop = (hours: number) => `${percent(hours)}%`

  return [
    'linear-gradient(to right',
    `${NIGHT} 0%`,
    `${NIGHT} ${stop(sunrise - TWILIGHT_HOURS)}`,
    `${TWILIGHT} ${stop(sunrise)}`,
    `${DAY} ${stop(sunrise + TWILIGHT_HOURS)}`,
    `${DAY} ${stop(sunset - TWILIGHT_HOURS)}`,
    `${TWILIGHT} ${stop(sunset)}`,
    `${NIGHT} ${stop(sunset + TWILIGHT_HOURS)}`,
    `${NIGHT} 100%)`,
  ].join(', ')
}

function percent(hours: number): number {
  return Math.min(100, Math.max(0, (hours / 24) * 100))
}
