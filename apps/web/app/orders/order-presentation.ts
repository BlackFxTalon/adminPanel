export { orderStatusLabels } from './order-status'

const rubFormatter = new Intl.NumberFormat('ru-RU', {
  style: 'currency',
  currency: 'RUB',
  minimumFractionDigits: 2,
})

const dateFormatter = new Intl.DateTimeFormat('ru-RU', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: 'UTC',
})

export function formatRub(minorUnits: number): string {
  return rubFormatter.format(minorUnits / 100)
}

export function formatOrderDate(value: string): string {
  return dateFormatter.format(new Date(value))
}

export function parseRubToMinor(value: string): number | null {
  const normalized = value.trim().replaceAll(' ', '').replaceAll(' ', '').replace(',', '.')
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(normalized)
  if (!match) return null
  const whole = Number(match[1])
  const fraction = Number((match[2] ?? '').padEnd(2, '0'))
  const minor = whole * 100 + fraction
  return Number.isSafeInteger(minor) ? minor : null
}
