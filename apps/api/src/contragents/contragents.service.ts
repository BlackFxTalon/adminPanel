import type { AuthenticatedUser } from '@admin-panel/contracts'
import { BadRequestException, Inject, Injectable } from '@nestjs/common'
import { randomUUID } from 'node:crypto'

import type { ContragentDirectoryPage, ContragentDirectoryQuery, ContragentKind, ContragentLookupItem } from './contragents.types.js'
import type { Prisma } from '../generated/prisma/client.js'
import { PrismaService } from '../database/prisma.service.js'

function queryError(message: string): never {
  throw new BadRequestException({ code: 'INVALID_CONTRAGENTS_QUERY', message, requestId: randomUUID() })
}

function parseQuery(raw: ContragentDirectoryQuery): ContragentDirectoryQuery {
  const { page, pageSize } = raw
  if (!Number.isInteger(page) || page < 1) queryError('Номер страницы должен быть положительным целым числом.')
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) queryError('Размер страницы должен быть от 1 до 100.')
  return raw
}

@Injectable()
export class ContragentsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async lookup(user: AuthenticatedUser, kind?: ContragentKind): Promise<readonly ContragentLookupItem[]> {
    const records = await this.prisma.client.contragent.findMany({
      where: { organizationId: user.organization.id, ...(kind ? { kind } : {}) },
      orderBy: { displayName: 'asc' },
      include: { contact: { include: { company: { include: { contragent: true } } } } },
    })
    return records.map((record) => {
      const companyName = record.contact?.company?.contragent.displayName
      return {
        id: record.id,
        label: record.displayName,
        kind: record.kind,
        ...(companyName ? { companyName } : {}),
      }
    })
  }

  async directory(user: AuthenticatedUser, rawQuery: ContragentDirectoryQuery): Promise<ContragentDirectoryPage> {
    const query = parseQuery(rawQuery)
    const search = query.search?.trim()
    const where: Prisma.ContragentWhereInput = {
      organizationId: user.organization.id,
      ...(query.kind ? { kind: query.kind } : {}),
      ...(search
        ? {
            OR: [
              { displayName: { contains: search, mode: 'insensitive' } },
              { contact: { phone: { contains: search, mode: 'insensitive' } } },
              { contact: { email: { contains: search, mode: 'insensitive' } } },
              { contact: { company: { contragent: { displayName: { contains: search, mode: 'insensitive' } } } } },
              { company: { legalName: { contains: search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    }
    const [records, total] = await this.prisma.client.$transaction([
      this.prisma.client.contragent.findMany({
        where,
        orderBy: { displayName: 'asc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        include: { contact: { include: { company: { include: { contragent: true } } } } },
      }),
      this.prisma.client.contragent.count({ where }),
    ])
    return {
      items: records.map(record => ({
        id: record.id,
        kind: record.kind,
        displayName: record.displayName,
        ...(record.contact?.phone ? { phone: record.contact.phone } : {}),
        ...(record.contact?.email ? { email: record.contact.email } : {}),
        ...(record.contact?.company?.contragent.displayName
          ? { companyName: record.contact.company.contragent.displayName }
          : {}),
      })),
      page: query.page,
      pageSize: query.pageSize,
      total,
    }
  }
}
