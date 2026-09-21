import type {
  AuthenticatedUser,
  TaskCreationOptions,
  TaskDetail,
  TasksPage,
  TasksQuery,
} from '@admin-panel/contracts'
import { BadRequestException, HttpException, Inject, Injectable, InternalServerErrorException } from '@nestjs/common'
import { randomUUID } from 'node:crypto'

import type { Prisma } from '../generated/prisma/client.js'
import { PrismaService } from '../database/prisma.service.js'
import { parseCreateTaskPayload } from './create-task-input.js'

type RawQuery = Readonly<Record<string, unknown>>

const sortFields: readonly TasksQuery['sortBy'][] = ['createdAt', 'number', 'title']
const sortDirections: readonly TasksQuery['sortDirection'][] = ['asc', 'desc']
const taskStatuses = ['open', 'in_progress', 'done', 'cancelled'] as const

function queryError(message: string): never {
  throw new BadRequestException({ code: 'INVALID_TASKS_QUERY', message, requestId: randomUUID() })
}

function queryString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined
}

function positiveInteger(value: unknown, fallback: number, name: string): number {
  if (value === undefined) return fallback
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed < 1) queryError(`${name} должен быть положительным целым числом.`)
  return parsed
}

function parseQuery(raw: RawQuery): TasksQuery {
  const sortBy = queryString(raw.sortBy) ?? 'createdAt'
  const sortDirection = queryString(raw.sortDirection) ?? 'desc'
  const search = queryString(raw.search)?.trim()
  const status = queryString(raw.status)
  const assigneeId = queryString(raw.assigneeId)
  const contragentId = queryString(raw.contragentId)
  const orderId = queryString(raw.orderId)
  if (!sortFields.includes(sortBy as TasksQuery['sortBy'])) queryError('Неподдерживаемое поле сортировки.')
  if (!sortDirections.includes(sortDirection as TasksQuery['sortDirection'])) queryError('Неподдерживаемое направление сортировки.')
  if (status && !taskStatuses.includes(status as typeof taskStatuses[number])) queryError('Неподдерживаемый статус Task.')
  const pageSize = positiveInteger(raw.pageSize, 10, 'Размер страницы')
  if (pageSize > 100) queryError('Размер страницы должен быть от 1 до 100.')
  const mine = raw.mine === 'true' || raw.mine === true
  const query = {
    page: positiveInteger(raw.page, 1, 'Номер страницы'),
    pageSize,
    sortBy: sortBy as TasksQuery['sortBy'],
    sortDirection: sortDirection as TasksQuery['sortDirection'],
    ...(search ? { search } : {}),
    ...(status ? { status: status as TasksQuery['status'] } : {}),
    ...(assigneeId ? { assigneeId } : {}),
    ...(contragentId ? { contragentId } : {}),
    ...(orderId ? { orderId } : {}),
    ...(mine ? { mine: true } : {}),
  }
  return query as TasksQuery
}

const summaryInclude = {
  assignee: true,
  contragent: true,
  order: true,
} satisfies Prisma.TaskInclude

function toDetail(record: Prisma.TaskGetPayload<{ include: typeof summaryInclude }>, organization: { id: string, name: string }): TaskDetail {
  return {
    id: record.id,
    createdAt: record.createdAt.toISOString(),
    number: record.number,
    title: record.title,
    ...(record.description ? { description: record.description } : {}),
    status: record.status,
    priority: record.priority,
    assignee: { id: record.assignee.id, name: record.assignee.name },
    ...(record.contragent ? { contragent: { id: record.contragent.id, label: record.contragent.displayName } } : {}),
    ...(record.order ? { order: { id: record.order.id, label: record.order.number } } : {}),
    organization: { id: organization.id, name: organization.name },
  }
}

@Injectable()
export class TasksService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async list(user: AuthenticatedUser, rawQuery: RawQuery): Promise<TasksPage> {
    const query = parseQuery(rawQuery)
    const search = query.search
    const where: Prisma.TaskWhereInput = {
      organizationId: user.organization.id,
      ...(query.status ? { status: query.status } : {}),
      // `mine` wins over an explicit assigneeId so the two filters never conflict.
      ...(query.mine ? { assigneeId: user.id } : query.assigneeId ? { assigneeId: query.assigneeId } : {}),
      ...(query.contragentId ? { contragentId: query.contragentId } : {}),
      ...(query.orderId ? { orderId: query.orderId } : {}),
      ...(search
        ? {
            OR: [
              { number: { contains: search, mode: 'insensitive' } },
              { title: { contains: search, mode: 'insensitive' } },
              { description: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    }
    const [[records, total], taskLinks] = await Promise.all([
      this.prisma.client.$transaction([
        this.prisma.client.task.findMany({
          where,
          include: summaryInclude,
          orderBy: { [query.sortBy]: query.sortDirection },
          skip: (query.page - 1) * query.pageSize,
          take: query.pageSize,
        }),
        this.prisma.client.task.count({ where }),
      ]),
      this.fetchTaskLinks(user.organization.id),
    ])
    return {
      items: records.map(record => toDetail(record, user.organization)),
      page: query.page,
      pageSize: query.pageSize,
      total,
      filterOptions: {
        assignees: taskLinks.assignees.map(candidate => ({ id: candidate.id, name: candidate.name })),
        contragents: taskLinks.contragents.map(candidate => ({ id: candidate.id, label: candidate.displayName })),
        orders: taskLinks.orders.map(candidate => ({ id: candidate.id, label: candidate.number })),
      },
    }
  }

  async creationOptions(user: AuthenticatedUser): Promise<TaskCreationOptions> {
    const taskLinks = await this.fetchTaskLinks(user.organization.id)
    return {
      assignees: taskLinks.assignees.map(candidate => ({ id: candidate.id, name: candidate.name })),
      contragents: taskLinks.contragents.map(candidate => ({ id: candidate.id, label: candidate.displayName })),
      orders: taskLinks.orders.map(candidate => ({ id: candidate.id, label: candidate.number })),
    }
  }

  async create(user: AuthenticatedUser, rawInput: unknown): Promise<TaskDetail> {
    try {
      return await this.prisma.client.$transaction(async (transaction) => {
        const taskLinks = await this.fetchTaskLinks(user.organization.id, transaction)
        const input = parseCreateTaskPayload(
          rawInput,
          {
            assignees: taskLinks.assignees.map(candidate => ({ id: candidate.id })),
            contragents: taskLinks.contragents.map(candidate => ({ id: candidate.id })),
            orders: taskLinks.orders.map(candidate => ({ id: candidate.id })),
          },
          user.id,
        )
        const sequence = await transaction.task.count({ where: { organizationId: user.organization.id } })
        const id = randomUUID()
        const record = await transaction.task.create({
          data: {
            id,
            organizationId: user.organization.id,
            number: `TASK-${new Date().getUTCFullYear()}-${String(sequence + 1).padStart(3, '0')}`,
            title: input.title,
            ...(input.description ? { description: input.description } : {}),
            status: 'open',
            priority: input.priority,
            assigneeId: input.assigneeId,
            ...(input.contragentId ? { contragentId: input.contragentId } : {}),
            ...(input.orderId ? { orderId: input.orderId } : {}),
          },
          include: summaryInclude,
        })
        return toDetail(record, user.organization)
      })
    } catch (error: unknown) {
      if (error instanceof HttpException) throw error
      throw new InternalServerErrorException({
        code: 'TASK_PERSISTENCE_FAILED',
        message: 'Не удалось сохранить Task.',
        requestId: randomUUID(),
      })
    }
  }

  private fetchTaskLinks(organizationId: string, transaction?: Prisma.TransactionClient) {
    const client = transaction ?? this.prisma.client
    return client.$transaction([
      client.user.findMany({
        where: { organizationId },
        orderBy: { name: 'asc' },
        select: { id: true, name: true },
      }),
      client.contragent.findMany({
        where: { organizationId },
        orderBy: { displayName: 'asc' },
        select: { id: true, displayName: true },
      }),
      client.order.findMany({
        where: { organizationId },
        orderBy: { number: 'asc' },
        select: { id: true, number: true },
      }),
    ]).then(([assignees, contragents, orders]) => ({ assignees, contragents, orders }))
  }
}
