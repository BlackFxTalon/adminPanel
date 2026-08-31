import { Module } from '@nestjs/common'

import { AuthModule } from './auth/auth.module.js'

@Module({ imports: [AuthModule] })
// NestJS discovers module metadata on the decorated class.
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class AppModule {}