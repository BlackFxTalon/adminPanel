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
