import type { CreateOrderInput, OrderCreationOptions } from '@admin-panel/contracts'

export type CreateOrderFieldErrors = Record<string, string[]>

export function validateCreateOrderInput(
  input: CreateOrderInput,
  options: OrderCreationOptions,
): CreateOrderFieldErrors {
  const fieldErrors: CreateOrderFieldErrors = {}
  if (!options.contragents.some(candidate => candidate.id === input.contragentId)) {
    fieldErrors.contragentId = ['Выберите контрагента.']
  }
  if (input.offerId && !options.offers.some(candidate => candidate.id === input.offerId)) {
    fieldErrors.offerId = ['Выберите существующее предложение.']
  }
  if (!Array.isArray(input.items) || input.items.length === 0) {
    fieldErrors.items = ['Добавьте хотя бы одну позицию.']
  }

  const clientIds = new Set<string>()
  input.items.forEach((candidate, index) => {
    const field = (name: string) => `items.${index}.${name}`
    if (!candidate.clientId || clientIds.has(candidate.clientId)) {
      fieldErrors[field('clientId')] = ['Позиция должна иметь уникальный идентификатор.']
    }
    clientIds.add(candidate.clientId)
    if (!candidate.name.trim()) fieldErrors[field('name')] = ['Введите название позиции.']
    if (!Number.isInteger(candidate.quantity) || candidate.quantity <= 0) {
      fieldErrors[field('quantity')] = ['Количество должно быть положительным целым числом.']
    }
    if (!Number.isInteger(candidate.unitPriceMinor) || candidate.unitPriceMinor < 0) {
      fieldErrors[field('unitPriceMinor')] = ['Цена не может быть отрицательной.']
    }
    if (candidate.weightGrams !== undefined && (!Number.isInteger(candidate.weightGrams) || candidate.weightGrams < 0)) {
      fieldErrors[field('weightGrams')] = ['Вес не может быть отрицательным.']
    }
    if (candidate.volumeCubicCentimeters !== undefined && (!Number.isInteger(candidate.volumeCubicCentimeters) || candidate.volumeCubicCentimeters < 0)) {
      fieldErrors[field('volumeCubicCentimeters')] = ['Объём не может быть отрицательным.']
    }
  })

  return fieldErrors
}
