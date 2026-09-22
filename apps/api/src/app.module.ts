import { Module } from '@nestjs/common'

import { AuthModule } from './auth/auth.module.js'
import { ContragentsModule } from './contragents/contragents.module.js'
import { DatabaseModule } from './database/database.module.js'
import { HealthModule } from './health/health.module.js'
import { OffersModule } from './offers/offers.module.js'
import { OrdersModule } from './orders/orders.module.js'
import { TasksModule } from './tasks/tasks.module.js'
import { UsersModule } from './users/users.module.js'

@Module({ imports: [AuthModule, DatabaseModule, HealthModule, ContragentsModule, OffersModule, OrdersModule, TasksModule, UsersModule] })
// NestJS discovers module metadata on the decorated class.
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class AppModule {}
