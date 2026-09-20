import { Module } from '@nestjs/common'

import { AuthModule } from './auth/auth.module.js'
import { DatabaseModule } from './database/database.module.js'
import { HealthModule } from './health/health.module.js'
import { OrdersModule } from './orders/orders.module.js'

@Module({ imports: [AuthModule, DatabaseModule, HealthModule, OrdersModule] })
// NestJS discovers module metadata on the decorated class.
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class AppModule {}
