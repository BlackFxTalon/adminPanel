import 'reflect-metadata'

import { NestFactory } from '@nestjs/core'
import { PostgreSqlContainer } from '@testcontainers/postgresql'
import { Client } from 'pg'

import { applyMigrations } from './apply-migrations'
import { seedOrdersDatabase } from '../prisma/seed'
import { AppModule } from '../dist/app.module.js'
import { createPrismaClient } from '../src/database/prisma-client'
import { readAuthTestEnvironment } from './auth-test-environment'

export default async function startApi(): Promise<() => Promise<void>> {
  readAuthTestEnvironment()
  const previousDatabaseUrl = process.env.DATABASE_URL
  const container = await new PostgreSqlContainer('postgres:17-alpine').start()
  process.env.DATABASE_URL = container.getConnectionUri()
  const sql = new Client({ connectionString: process.env.DATABASE_URL })
  await sql.connect()
  await applyMigrations(sql)
  await sql.end()
  const prisma = createPrismaClient(process.env.DATABASE_URL)
  try {
    await seedOrdersDatabase(prisma)
  } finally {
    await prisma.$disconnect()
  }

  const app = await NestFactory.create(AppModule, { logger: false })
  await app.listen(3001, '127.0.0.1')
  return async () => {
    await app.close()
    await container.stop()
    if (previousDatabaseUrl === undefined) delete process.env.DATABASE_URL
    else process.env.DATABASE_URL = previousDatabaseUrl
  }
}
