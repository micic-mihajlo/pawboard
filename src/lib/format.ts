const LOCALE = 'en-CA'

export function formatShortDate(value: string | Date) {
  return new Date(value).toLocaleDateString(LOCALE, {
    month: 'short',
    day: 'numeric',
  })
}

export function formatLongDate(value: string | Date) {
  return new Date(value).toLocaleDateString(LOCALE, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function formatDateTime(value: string | Date) {
  return new Date(value).toLocaleString(LOCALE, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function formatTime(value: string | Date) {
  return new Date(value).toLocaleTimeString(LOCALE, {
    hour: 'numeric',
    minute: '2-digit',
  })
}

/** ISO string -> value for <input type="date">. */
export function toDateInputValue(value: string | Date) {
  const date = new Date(value)
  if (Number.isNaN(date.valueOf())) return ''
  return date.toISOString().slice(0, 10)
}

/** ISO string -> value for <input type="datetime-local"> in local time. */
export function toDateTimeLocalValue(value: string | Date) {
  const date = new Date(value)
  if (Number.isNaN(date.valueOf())) return ''
  const offsetMs = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16)
}

/** datetime-local input value -> ISO string. */
export function fromInputValue(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.valueOf()) ? '' : date.toISOString()
}

export function titleCase(value: string) {
  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}
