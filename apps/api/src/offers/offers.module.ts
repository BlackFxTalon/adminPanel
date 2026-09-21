import { Module } from '@nestjs/common'

import { AuthModule } from '../auth/auth.module.js'
import { OffersController } from './offers.controller.js'
import { OffersService } from './offers.service.js'

@Module({
  imports: [AuthModule],
  controllers: [OffersController],
  providers: [OffersService],
})
// NestJS discovers module metadata on the decorated class.
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class OffersModule {}
