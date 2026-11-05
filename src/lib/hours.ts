import type { DayHours } from './types'

export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}
/** "00:00" as a closing time means midnight at the END of the day. */
const closeMin = (hhmm: string) => (toMin(hhmm) === 0 ? 1440 : toMin(hhmm))

/** Day of week (0-6) and minutes since midnight in the restaurant's timezone. */
export function zonedNow(now: Date, timeZone: string): { day: number; minutes: number } {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
    .formatToParts(now)
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? ''
  const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'))
  return { day, minutes: Number(get('hour')) * 60 + Number(get('minute')) }
}

export function openStatus(hours: DayHours[], now: Date, timeZone: string): { open: boolean; label: string } {
  const { day, minutes } = zonedNow(now, timeZone)
  const byDay = (d: number) => hours.find((h) => h.day === ((d + 7) % 7))
  const today = byDay(day)
  const yesterday = byDay(day - 1)

  // spill-over from an overnight opening that started yesterday
  if (yesterday && !yesterday.closed && closeMin(yesterday.close) < toMin(yesterday.open) && minutes < closeMin(yesterday.close))
    return { open: true, label: `Open until ${yesterday.close}` }

  if (today && !today.closed) {
    const o = toMin(today.open)
    const c = closeMin(today.close)
    const overnight = c < o
    if (minutes >= o && (overnight || minutes < c)) return { open: true, label: `Open until ${today.close === '00:00' ? 'midnight' : today.close}` }
    if (minutes < o) return { open: false, label: `Closed · opens today at ${today.open}` }
  }
  for (let i = 1; i <= 7; i++) {
    const next = byDay(day + i)
    if (next && !next.closed) return { open: false, label: `Closed · opens ${i === 1 ? 'tomorrow' : DAY_NAMES[next.day]} at ${next.open}` }
  }
  return { open: false, label: 'Closed' }
}
