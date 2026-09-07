import { Injectable, type OnModuleDestroy } from '@nestjs/common'

import type { DatabaseClient } from './prisma-client.js'
import { createPrismaClient } from './prisma-client.js'

@Injectable()
export class PrismaService implements OnModuleDestroy {
  readonly client: DatabaseClient

  constructor() {
    const databaseUrl = process.env.DATABASE_URL
    if (!databaseUrl) throw new Error('DATABASE_URL is required to start the API')
    this.client = createPrismaClient(databaseUrl)
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.$disconnect()
  }
}
