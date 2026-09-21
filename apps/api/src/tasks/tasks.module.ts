import { Module } from '@nestjs/common'

import { AuthModule } from '../auth/auth.module.js'
import { TasksController } from './tasks.controller.js'
import { TasksService } from './tasks.service.js'

@Module({
  imports: [AuthModule],
  controllers: [TasksController],
  providers: [TasksService],
})
// NestJS discovers module metadata on the decorated class.
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class TasksModule {}
