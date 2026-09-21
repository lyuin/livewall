import { useEffect, useState } from 'react'
import { CITIES, type City } from '../lib/cities'
import {
  cityTime,
  dayDifference,
  formatClock,
  formatDate,
  formatDayOffset,
  formatDuration,
  localDate,
  nextSunEvent,
  type CalendarDate,
  type CityTime,
} from '../lib/sun'

// 秒は出さないので 10 秒ごとで足りる。9 本再生中の負荷を増やしたくない。
const TICK_MS = 10_000

const NIGHT = '#101a2e'
const TWILIGHT = '#c4703a'
const DAY = '#9dc3e6'

// 日の出・日の入りの前後にこの時間だけグラデーションをかけ、薄明を表す
const TWILIGHT_HOURS = 0.8

const WEEKDAY_FORMAT = new Intl.DateTimeFormat('en-US', { weekday: 'short' })

// hourCycle: 'h23' を指定するのは、hour12: false だと 0 時を 24 と返す実装があるため
const LOCAL_TIME_FORMAT = new Intl.DateTimeFormat('en-GB', {
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

type Props = {
  /** ツールバーと配信名の表示を切り替える。映像をタップするとプレイヤーが反応するため、
      iframe の外にあるこの帯が受け皿になる。 */
  onToggle: () => void
}

export default function WorldClock({ onToggle }: Props) {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), TICK_MS)
    return () => window.clearInterval(timer)
  }, [])

  const today = localDate(now)
  const next = nextSunEvent(CITIES, now)

  return (
    <button
      type="button"
      className="world"
      onClick={onToggle}
      aria-label="Toggle stream names and controls"
    >
      <div className="edge">
        {/* 端末の日時であることを明示する。都市ごとの日付ずれはこれを基準に測る。
            中央に東京があるので時刻は重複するが、基準が一目で分かる方を採る。 */}
        <div className="edge__label">Local time</div>
        <div className="edge__value">
          {formatDate(today)} {WEEKDAY_FORMAT.format(now)} · {LOCAL_TIME_FORMAT.format(now)}
        </div>
      </div>

      <div className="cities">
        {CITIES.map((city) => (
          <CityClock key={city.timeZone} city={city} now={now} today={today} />
        ))}
      </div>

      <div className="edge edge--right">
        {next === null ? (
          <>
            <div className="edge__label">Next</div>
            <div className="edge__value">—</div>
          </>
        ) : (
          <>
            {/* 見出しに出来事を入れ、値に in を入れる。矢印だけでは何の残り時間か読めなかった。 */}
            <div className="edge__label">Next {next.kind}</div>
            <div className="edge__value">
              {next.city.label} in {formatDuration(next.minutesUntil)}
            </div>
          </>
        )}
      </div>
    </button>
  )
}

type CityProps = {
  city: City
  now: Date
  today: CalendarDate
}

function CityClock({ city, now, today }: CityProps) {
  const time = cityTime(city.latitude, city.longitude, city.timeZone, now)
  const clock = formatClock(time.hours)

  // 日付が違う都市にだけずれを添える。実際の日付を出すと都市名と合わせて長くなりすぎる。
  // 曜日の略称（SUN など）は、このアプリが日の出・日の入りを扱うため
  // 「日曜」か「太陽」か読み分けられないので使わない。
  const offset = dayDifference(time.date, today)

  return (
    <div className={`city ${time.isDay ? 'city--day' : 'city--night'}`}>
      <div className="city__name">
        {city.label}
        {offset !== 0 && <span className="city__offset">{formatDayOffset(offset)}</span>}
      </div>

      {/* 昼夜を色だけに担わせないよう、読み上げ用の文にも入れる */}
      <div
        className="city__time"
        aria-label={`${city.name} ${clock} ${time.isDay ? 'day' : 'night'}${
          offset === 0 ? '' : ` on ${formatDate(time.date)}`
        }`}
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
