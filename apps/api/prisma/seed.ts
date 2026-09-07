import { pathToFileURL } from 'node:url'

import type { DatabaseClient } from '../src/database/prisma-client'
import { createPrismaClient } from '../src/database/prisma-client'

const organizations = [
  { id: 'org_local', name: 'Local Organization' },
  { id: 'org_foreign', name: 'Foreign Organization' },
] as const

const users = [
  { id: 'user_admin_local', organizationId: 'org_local', email: 'admin@local.invalid', name: 'Local Admin', role: 'admin' },
  { id: 'user_local', organizationId: 'org_local', email: 'user@local.invalid', name: 'Local User', role: 'user' },
  { id: 'user_foreign', organizationId: 'org_foreign', email: 'user@foreign.invalid', name: 'Foreign User', role: 'user' },
] as const

const contragents = [
  { id: 'contragent-local-factory', organizationId: 'org_local', kind: 'company', displayName: 'Уралмашзавод' },
  { id: 'contragent-local-reducer', organizationId: 'org_local', kind: 'company', displayName: 'Уралредуктор' },
  { id: 'contragent-local-contact', organizationId: 'org_local', kind: 'contact', displayName: 'Анна Соколова' },
  { id: 'contragent-foreign-company', organizationId: 'org_foreign', kind: 'company', displayName: 'Foreign Company' },
] as const

export async function seedOrdersDatabase(prisma: DatabaseClient): Promise<void> {
  await prisma.$transaction(async (tx) => {
    for (const organization of organizations) {
      await tx.organization.upsert({
        where: { id: organization.id },
        create: organization,
        update: { name: organization.name },
      })
    }
    for (const user of users) {
      await tx.user.upsert({
        where: { id: user.id },
        create: user,
        update: { email: user.email, name: user.name, organizationId: user.organizationId, role: user.role },
      })
    }
    for (const contragent of contragents) {
      await tx.contragent.upsert({
        where: { id: contragent.id },
        create: contragent,
        update: {
          displayName: contragent.displayName,
          kind: contragent.kind,
          organizationId: contragent.organizationId,
        },
      })
    }

    const companies = [
      { id: 'company-local-factory', organizationId: 'org_local', contragentId: 'contragent-local-factory', legalName: 'АО Уралмашзавод', taxId: '6600000001' },
      { id: 'company-local-reducer', organizationId: 'org_local', contragentId: 'contragent-local-reducer', legalName: 'ООО Уралредуктор', taxId: '6600000002' },
      { id: 'company-foreign', organizationId: 'org_foreign', contragentId: 'contragent-foreign-company', legalName: 'Foreign Company LLC', taxId: null },
    ] as const
    for (const company of companies) {
      await tx.company.upsert({ where: { id: company.id }, create: company, update: company })
    }
    await tx.contact.upsert({
      where: { id: 'contact-local-anna' },
      create: {
        id: 'contact-local-anna',
        organizationId: 'org_local',
        contragentId: 'contragent-local-contact',
        companyId: 'company-local-reducer',
        fullName: 'Анна Соколова',
        email: 'anna@local.invalid',
      },
      update: {
        companyId: 'company-local-reducer',
        fullName: 'Анна Соколова',
        email: 'anna@local.invalid',
      },
    })

    const offers = [
      { id: 'offer-local-1', organizationId: 'org_local', contragentId: 'contragent-local-reducer', number: 'OFF-2026-001', title: 'Предложение на редукторы' },
      { id: 'offer-local-2', organizationId: 'org_local', contragentId: null, number: 'OFF-2026-002', title: 'Предложение на логистику' },
    ] as const
    for (const offer of offers) {
      await tx.offer.upsert({ where: { id: offer.id }, create: offer, update: offer })
    }

    const orders = [
      {
        id: 'order-local-1', organizationId: 'org_local', number: 'ORD-2026-001',
        contragentId: 'contragent-local-factory', offerId: null, responsibleUserId: 'user_admin_local',
        status: 'pending_approval', currency: 'RUB', totalMinor: 1250000n,
        createdAt: new Date('2026-08-01T09:00:00.000Z'),
      },
      {
        id: 'order-local-2', organizationId: 'org_local', number: 'ORD-2026-002',
        contragentId: 'contragent-local-reducer', offerId: 'offer-local-1', responsibleUserId: 'user_local',
        status: 'in_work', currency: 'RUB', totalMinor: 30000000n,
        createdAt: new Date('2026-08-04T12:00:00.000Z'),
      },
      {
        id: 'order-foreign-1', organizationId: 'org_foreign', number: 'ORD-2026-001',
        contragentId: 'contragent-foreign-company', offerId: null, responsibleUserId: 'user_foreign',
        status: 'pending_approval', currency: 'RUB', totalMinor: 10000n,
        createdAt: new Date('2026-08-02T10:00:00.000Z'),
      },
    ] as const
    for (const order of orders) {
      await tx.order.upsert({ where: { id: order.id }, create: order, update: order })
    }

    const items = [
      { id: 'item-local-1', orderId: 'order-local-1', organizationId: 'org_local', position: 1, name: 'Комплект крепежа', quantity: 10, unitPriceMinor: 125000n, amountMinor: 1250000n },
      { id: 'item-local-2', orderId: 'order-local-2', organizationId: 'org_local', position: 1, name: 'Промышленный редуктор', quantity: 2, unitPriceMinor: 14500000n, amountMinor: 29000000n },
      { id: 'item-local-3', orderId: 'order-local-2', organizationId: 'org_local', position: 2, name: 'Муфта', quantity: 4, unitPriceMinor: 250000n, amountMinor: 1000000n },
      { id: 'item-foreign-1', orderId: 'order-foreign-1', organizationId: 'org_foreign', position: 1, name: 'Foreign item', quantity: 1, unitPriceMinor: 10000n, amountMinor: 10000n },
    ] as const
    for (const item of items) {
      await tx.orderItem.upsert({ where: { id: item.id }, create: item, update: item })
    }
  })
}

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) throw new Error('DATABASE_URL is required to seed the database')
  const prisma = createPrismaClient(databaseUrl)
  try {
    await seedOrdersDatabase(prisma)
  } finally {
    await prisma.$disconnect()
  }
}

const entryPath = process.argv[1]
if (entryPath && import.meta.url === pathToFileURL(entryPath).href) {
  await main()
}
