import type { CreateOrderInput, CreateOrderItemInput, OrderCreationOptions } from '@admin-panel/contracts'
import { BadRequestException } from '@nestjs/common'
import { randomUUID } from 'node:crypto'

type FieldErrors = Record<string, string[]>
type UnknownRecord = Record<string, unknown>

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function addError(errors: FieldErrors, field: string, message: string): void {
  errors[field] = [...(errors[field] ?? []), message]
}

function optionalNonNegativeInteger(
  record: UnknownRecord,
  field: 'weightGrams' | 'volumeCubicCentimeters',
  path: string,
  errors: FieldErrors,
): number | undefined {
  const value = record[field]
  if (value === undefined) return undefined
  if (!Number.isSafeInteger(value) || Number(value) < 0) {
    addError(errors, path, field === 'weightGrams' ? 'Вес не может быть отрицательным.' : 'Объём не может быть отрицательным.')
    return undefined
  }
  return Number(value)
}

function parseItem(value: unknown, index: number, clientIds: Set<string>, errors: FieldErrors): CreateOrderItemInput | undefined {
  const path = (field: string) => `items.${index}.${field}`
  if (!isRecord(value)) {
    addError(errors, `items.${index}`, 'Позиция должна быть объектом.')
    return undefined
  }

  const clientId = typeof value.clientId === 'string' ? value.clientId : ''
  if (!clientId || clientIds.has(clientId)) addError(errors, path('clientId'), 'Позиция должна иметь уникальный идентификатор.')
  clientIds.add(clientId)

  const name = typeof value.name === 'string' ? value.name.trim() : ''
  if (!name) addError(errors, path('name'), 'Введите название позиции.')

  const quantity = value.quantity
  if (!Number.isSafeInteger(quantity) || Number(quantity) <= 0) {
    addError(errors, path('quantity'), 'Количество должно быть положительным целым числом.')
  }
  const unitPriceMinor = value.unitPriceMinor
  if (!Number.isSafeInteger(unitPriceMinor) || Number(unitPriceMinor) < 0) {
    addError(errors, path('unitPriceMinor'), 'Цена не может быть отрицательной.')
  }
  if (Number.isSafeInteger(quantity) && Number.isSafeInteger(unitPriceMinor)
    && !Number.isSafeInteger(Number(quantity) * Number(unitPriceMinor))) {
    addError(errors, path('unitPriceMinor'), 'Стоимость позиции выходит за поддерживаемый диапазон.')
  }

  const characteristics = value.characteristics
  if (characteristics !== undefined && typeof characteristics !== 'string') {
    addError(errors, path('characteristics'), 'Характеристики должны быть строкой.')
  }
  const weightGrams = optionalNonNegativeInteger(value, 'weightGrams', path('weightGrams'), errors)
  const volumeCubicCentimeters = optionalNonNegativeInteger(value, 'volumeCubicCentimeters', path('volumeCubicCentimeters'), errors)
  if (Object.keys(errors).some(field => field === `items.${index}` || field.startsWith(`items.${index}.`))) return undefined

  return {
    clientId,
    name,
    quantity: Number(quantity),
    unitPriceMinor: Number(unitPriceMinor),
    ...(typeof characteristics === 'string' && characteristics.trim() ? { characteristics: characteristics.trim() } : {}),
    ...(weightGrams !== undefined ? { weightGrams } : {}),
    ...(volumeCubicCentimeters !== undefined ? { volumeCubicCentimeters } : {}),
  }
}

export function parseCreateOrderPayload(raw: unknown, options: OrderCreationOptions): CreateOrderInput {
  const errors: FieldErrors = {}
  const record = isRecord(raw) ? raw : {}
  const contragentId = typeof record.contragentId === 'string' ? record.contragentId : ''
  if (!options.contragents.some(candidate => candidate.id === contragentId)) {
    addError(errors, 'contragentId', 'Выберите контрагента.')
  }

  const offerId = typeof record.offerId === 'string' ? record.offerId : undefined
  if (record.offerId !== undefined && (!offerId || !options.offers.some(candidate => candidate.id === offerId))) {
    addError(errors, 'offerId', 'Выберите существующее предложение.')
  }

  const rawItems = Array.isArray(record.items) ? record.items : []
  if (rawItems.length === 0) addError(errors, 'items', 'Добавьте хотя бы одну позицию.')
  const clientIds = new Set<string>()
  const parsedItems = rawItems.map((item, index) => parseItem(item, index, clientIds, errors))

  const validItems = parsedItems.filter((item): item is CreateOrderItemInput => item !== undefined)
  const total = validItems.reduce((sum, item) => sum + item.quantity * item.unitPriceMinor, 0)
  if (!Number.isSafeInteger(total)) addError(errors, 'items', 'Общая стоимость выходит за поддерживаемый диапазон.')

  if (Object.keys(errors).length > 0 || validItems.length !== rawItems.length || validItems.length === 0) {
    throw new BadRequestException({
      code: 'ORDER_VALIDATION_FAILED',
      message: 'Исправьте ошибки в форме.',
      requestId: randomUUID(),
      fieldErrors: errors,
    })
  }

  const first = validItems[0]
  if (!first) throw new Error('Validated Order items unexpectedly empty')
  return {
    contragentId,
    ...(offerId ? { offerId } : {}),
    items: [first, ...validItems.slice(1)],
  }
}
