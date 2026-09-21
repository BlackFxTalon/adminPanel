import type { CreateTaskInput, TaskPriority } from '@admin-panel/contracts'
import { taskPriorities } from '@admin-panel/contracts'
import { BadRequestException } from '@nestjs/common'
import { randomUUID } from 'node:crypto'

type FieldErrors = Record<string, string[]>
type UnknownRecord = Record<string, unknown>

interface TaskCreationOptions {
  readonly assignees: readonly { readonly id: string }[]
  readonly contragents: readonly { readonly id: string }[]
  readonly orders: readonly { readonly id: string }[]
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function addError(errors: FieldErrors, field: string, message: string): void {
  errors[field] = [...(errors[field] ?? []), message]
}

export function parseCreateTaskPayload(raw: unknown, options: TaskCreationOptions, currentUserId: string): CreateTaskInput {
  const errors: FieldErrors = {}
  const record = isRecord(raw) ? raw : {}

  const title = typeof record.title === 'string' ? record.title.trim() : ''
  if (!title) addError(errors, 'title', 'Введите название задачи.')

  const description = typeof record.description === 'string' ? record.description.trim() : undefined
  if (record.description !== undefined && typeof record.description !== 'string') {
    addError(errors, 'description', 'Описание должно быть строкой.')
  }

  const rawPriority = record.priority ?? 'medium'
  if (typeof rawPriority !== 'string' || !taskPriorities.includes(rawPriority as TaskPriority)) {
    addError(errors, 'priority', 'Выберите допустимый приоритет.')
  }

  const rawAssigneeId = typeof record.assigneeId === 'string' && record.assigneeId ? record.assigneeId : currentUserId
  if (typeof rawAssigneeId !== 'string' || !options.assignees.some(candidate => candidate.id === rawAssigneeId)) {
    addError(errors, 'assigneeId', 'Выберите исполнителя из вашей организации.')
  }

  const rawContragentId = typeof record.contragentId === 'string' ? record.contragentId : undefined
  if (record.contragentId !== undefined && (!rawContragentId || !options.contragents.some(candidate => candidate.id === rawContragentId))) {
    addError(errors, 'contragentId', 'Выберите существующего контрагента.')
  }

  const rawOrderId = typeof record.orderId === 'string' ? record.orderId : undefined
  if (record.orderId !== undefined && (!rawOrderId || !options.orders.some(candidate => candidate.id === rawOrderId))) {
    addError(errors, 'orderId', 'Выберите существующий заказ.')
  }

  if (Object.keys(errors).length > 0) {
    throw new BadRequestException({
      code: 'TASK_VALIDATION_FAILED',
      message: 'Исправьте ошибки в форме.',
      requestId: randomUUID(),
      fieldErrors: errors,
    })
  }

  return {
    title,
    ...(description ? { description } : {}),
    priority: rawPriority as TaskPriority,
    assigneeId: rawAssigneeId,
    ...(rawContragentId ? { contragentId: rawContragentId } : {}),
    ...(rawOrderId ? { orderId: rawOrderId } : {}),
  }
}
