import { Module } from '@nestjs/common'

import { AuthModule } from '../auth/auth.module.js'
import { ContragentsController } from './contragents.controller.js'
import { ContragentsService } from './contragents.service.js'

@Module({
  imports: [AuthModule],
  controllers: [ContragentsController],
  providers: [ContragentsService],
})
// NestJS discovers module metadata on the decorated class.
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class ContragentsModule {}
