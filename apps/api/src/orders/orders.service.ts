import type {
  AuthenticatedUser,
  OrderCreationOptions,
  OrderDetail,
  OrderStatus,
  OrderSummary,
  OrdersPage,
  OrdersQuery,
} from '@admin-panel/contracts'
import { canTransitionOrderStatus, orderStatuses } from '@admin-panel/contracts'
import {
  BadRequestException,
  ConflictException,
  HttpException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common'
import { randomUUID } from 'node:crypto'

import type { Prisma } from '../generated/prisma/client.js'
import { PrismaService } from '../database/prisma.service.js'
import { parseCreateOrderPayload } from './create-order-input.js'

const summaryInclude = {
  contragent: true,
  offer: true,
  responsibleUser: true,
  organization: true,
} satisfies Prisma.OrderInclude

const detailInclude = {
  ...summaryInclude,
  items: { orderBy: { position: 'asc' as const } },
} satisfies Prisma.OrderInclude

type SummaryRecord = Prisma.OrderGetPayload<{ include: typeof summaryInclude }>
type DetailRecord = Prisma.OrderGetPayload<{ include: typeof detailInclude }>
type RawQuery = Readonly<Record<string, unknown>>

function queryError(message: string): never {
  throw new BadRequestException({ code: 'INVALID_ORDERS_QUERY', message, requestId: randomUUID() })
}

function queryString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined
}

function parseStatusTransition(raw: unknown): OrderStatus {
  const status = typeof raw === 'object' && raw !== null && !Array.isArray(raw)
    ? (raw as Record<string, unknown>).status
    : undefined
  if (typeof status !== 'string' || !orderStatuses.includes(status as OrderStatus)) {
    throw new BadRequestException({
      code: 'ORDER_STATUS_VALIDATION_FAILED',
      message: 'Укажите допустимый статус Order.',
      requestId: randomUUID(),
      fieldErrors: { status: ['Выберите допустимый следующий статус.'] },
    })
  }
  return status as OrderStatus
}

function positiveInteger(value: unknown, fallback: number, name: string): number {
  if (value === undefined) return fallback
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed < 1) queryError(`${name} должен быть положительным целым числом.`)
  return parsed
}

function parseQuery(raw: RawQuery): OrdersQuery {
  const sortBy = queryString(raw.sortBy) ?? 'createdAt'
  const sortDirection = queryString(raw.sortDirection) ?? 'desc'
  const status = queryString(raw.status)
  const search = queryString(raw.search)?.trim()
  const contragentId = queryString(raw.contragentId)
  if (!['createdAt', 'number', 'totalMinor'].includes(sortBy)) queryError('Неподдерживаемое поле сортировки.')
  if (!['asc', 'desc'].includes(sortDirection)) queryError('Неподдерживаемое направление сортировки.')
  if (status && !orderStatuses.includes(status as OrderStatus)) queryError('Неподдерживаемый статус Order.')
  const pageSize = positiveInteger(raw.pageSize, 10, 'Размер страницы')
  if (pageSize > 100) queryError('Размер страницы должен быть от 1 до 100.')
  return {
    page: positiveInteger(raw.page, 1, 'Номер страницы'),
    pageSize,
    sortBy: sortBy as OrdersQuery['sortBy'],
    sortDirection: sortDirection as OrdersQuery['sortDirection'],
    ...(search ? { search } : {}),
    ...(status ? { status: status as OrderStatus } : {}),
    ...(contragentId ? { contragentId } : {}),
  }
}

function minorUnits(value: bigint): number {
  const result = Number(value)
  if (!Number.isSafeInteger(result)) throw new Error('Money value exceeds the supported contract range')
  return result
}

function toSummary(record: SummaryRecord): OrderSummary {
  return {
    id: record.id,
    createdAt: record.createdAt.toISOString(),
    number: record.number,
    contragent: { id: record.contragent.id, label: record.contragent.displayName },
    ...(record.offer ? { offer: { id: record.offer.id, label: record.offer.title } } : {}),
    totalMinor: minorUnits(record.totalMinor),
    currency: 'RUB',
    status: record.status,
    responsibleUser: { id: record.responsibleUser.id, name: record.responsibleUser.name },
    organization: { id: record.organization.id, name: record.organization.name },
  }
}

function toDetail(record: DetailRecord): OrderDetail {
  const mappedItems = record.items.map(item => ({
    id: item.id,
    name: item.name,
    quantity: item.quantity,
    unitPriceMinor: minorUnits(item.unitPriceMinor),
    amountMinor: minorUnits(item.amountMinor),
    ...(item.characteristics ? { characteristics: item.characteristics } : {}),
    ...(item.weightGrams !== null ? { weightGrams: item.weightGrams } : {}),
    ...(item.volumeCubicCentimeters !== null ? { volumeCubicCentimeters: item.volumeCubicCentimeters } : {}),
  }))
  const [first, ...remaining] = mappedItems
  if (!first) throw new Error('Persisted Order must contain at least one item')
  return { ...toSummary(record), items: [first, ...remaining] }
}

@Injectable()
export class OrdersService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async list(user: AuthenticatedUser, rawQuery: RawQuery): Promise<OrdersPage> {
    const query = parseQuery(rawQuery)
    const search = query.search
    const where: Prisma.OrderWhereInput = {
      organizationId: user.organization.id,
      ...(query.status ? { status: query.status } : {}),
      ...(query.contragentId ? { contragentId: query.contragentId } : {}),
      ...(search
        ? {
            OR: [
              { number: { contains: search, mode: 'insensitive' } },
              { contragent: { displayName: { contains: search, mode: 'insensitive' } } },
              { responsibleUser: { name: { contains: search, mode: 'insensitive' } } },
              { items: { some: { name: { contains: search, mode: 'insensitive' } } } },
            ],
          }
        : {}),
    }
    const orderBy = { [query.sortBy]: query.sortDirection } as Prisma.OrderOrderByWithRelationInput
    const [records, total, contragents] = await this.prisma.client.$transaction([
      this.prisma.client.order.findMany({
        where,
        include: summaryInclude,
        orderBy,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.client.order.count({ where }),
      this.prisma.client.contragent.findMany({
        where: { organizationId: user.organization.id },
        orderBy: { displayName: 'asc' },
      }),
    ])
    return {
      items: records.map(toSummary),
      page: query.page,
      pageSize: query.pageSize,
      total,
      filterOptions: {
        contragents: contragents.map(candidate => ({ id: candidate.id, label: candidate.displayName })),
      },
    }
  }

  async creationOptions(user: AuthenticatedUser): Promise<OrderCreationOptions> {
    const [contragents, offers] = await this.prisma.client.$transaction([
      this.prisma.client.contragent.findMany({
        where: { organizationId: user.organization.id },
        orderBy: { displayName: 'asc' },
      }),
      this.prisma.client.offer.findMany({
        where: { organizationId: user.organization.id },
        orderBy: { title: 'asc' },
      }),
    ])
    return {
      contragents: contragents.map(candidate => ({ id: candidate.id, label: candidate.displayName })),
      offers: offers.map(candidate => ({ id: candidate.id, label: candidate.title })),
    }
  }

  async create(user: AuthenticatedUser, rawInput: unknown): Promise<OrderDetail> {
    try {
      return await this.prisma.client.$transaction(async (transaction) => {
        const contragents = await transaction.contragent.findMany({
          where: { organizationId: user.organization.id },
          orderBy: { displayName: 'asc' },
        })
        const offers = await transaction.offer.findMany({
          where: { organizationId: user.organization.id },
          orderBy: { title: 'asc' },
        })
        const input = parseCreateOrderPayload(rawInput, {
          contragents: contragents.map(candidate => ({ id: candidate.id, label: candidate.displayName })),
          offers: offers.map(candidate => ({ id: candidate.id, label: candidate.title })),
        })
        const id = randomUUID()
        const createdAt = new Date()
        const itemData = input.items.map((item, index) => {
          const amountMinor = BigInt(item.quantity) * BigInt(item.unitPriceMinor)
          return {
            id: randomUUID(),
            orderId: id,
            organizationId: user.organization.id,
            position: index + 1,
            name: item.name,
            quantity: item.quantity,
            unitPriceMinor: BigInt(item.unitPriceMinor),
            amountMinor,
            ...(item.characteristics ? { characteristics: item.characteristics } : {}),
            ...(item.weightGrams !== undefined ? { weightGrams: item.weightGrams } : {}),
            ...(item.volumeCubicCentimeters !== undefined
              ? { volumeCubicCentimeters: item.volumeCubicCentimeters }
              : {}),
          }
        })
        const totalMinor = itemData.reduce((sum, item) => sum + item.amountMinor, 0n)
        await transaction.order.create({
          data: {
            id,
            organizationId: user.organization.id,
            number: `ORD-${createdAt.getUTCFullYear()}-${id.slice(0, 8).toUpperCase()}`,
            contragentId: input.contragentId,
            ...(input.offerId ? { offerId: input.offerId } : {}),
            responsibleUserId: user.id,
            status: 'pending_approval',
            currency: 'RUB',
            totalMinor,
            createdAt,
          },
        })
        await transaction.orderItem.createMany({ data: itemData })
        const record = await transaction.order.findUniqueOrThrow({
          where: { id },
          include: detailInclude,
        })
        return toDetail(record)
      })
    } catch (error: unknown) {
      if (error instanceof HttpException) throw error
      throw new InternalServerErrorException({
        code: 'ORDER_PERSISTENCE_FAILED',
        message: 'Не удалось сохранить Order.',
        requestId: randomUUID(),
      })
    }
  }

  async transitionStatus(user: AuthenticatedUser, id: string, rawInput: unknown): Promise<OrderDetail> {
    const status = parseStatusTransition(rawInput)
    try {
      return await this.prisma.client.$transaction(async (transaction) => {
        const current = await transaction.order.findFirst({
          where: { id, organizationId: user.organization.id },
          select: { status: true },
        })
        if (!current) {
          throw new NotFoundException({
            code: 'ORDER_NOT_FOUND',
            message: 'Order не найден.',
            requestId: randomUUID(),
          })
        }
        if (!canTransitionOrderStatus(current.status, status)) {
          throw new ConflictException({
            code: 'INVALID_ORDER_STATUS_TRANSITION',
            message: 'Недопустимый переход статуса Order.',
            requestId: randomUUID(),
          })
        }

        const updated = await transaction.order.updateMany({
          where: {
            id,
            organizationId: user.organization.id,
            status: current.status,
          },
          data: { status },
        })
        if (updated.count !== 1) {
          throw new ConflictException({
            code: 'ORDER_STATUS_CONFLICT',
            message: 'Статус Order уже изменился. Обновите данные и повторите действие.',
            requestId: randomUUID(),
          })
        }
        const record = await transaction.order.findUniqueOrThrow({
          where: { id },
          include: detailInclude,
        })
        return toDetail(record)
      })
    } catch (error: unknown) {
      if (error instanceof HttpException) throw error
      throw new InternalServerErrorException({
        code: 'ORDER_STATUS_UPDATE_FAILED',
        message: 'Не удалось изменить статус Order.',
        requestId: randomUUID(),
      })
    }
  }

  async detail(user: AuthenticatedUser, id: string): Promise<OrderDetail> {
    const record = await this.prisma.client.order.findFirst({
      where: { id, organizationId: user.organization.id },
      include: detailInclude,
    })
    if (!record) {
      throw new NotFoundException({
        code: 'ORDER_NOT_FOUND',
        message: 'Order не найден.',
        requestId: randomUUID(),
      })
    }
    return toDetail(record)
  }
}
