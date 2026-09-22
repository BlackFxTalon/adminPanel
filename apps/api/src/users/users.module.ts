import { Module } from '@nestjs/common'

import { AuthModule } from '../auth/auth.module.js'
import { UsersController } from './users.controller.js'
import { UsersService } from './users.service.js'

@Module({
  imports: [AuthModule],
  controllers: [UsersController],
  providers: [UsersService],
})
// NestJS discovers module metadata on the decorated class.
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class UsersModule {}
