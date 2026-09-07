import { Global, Module } from '@nestjs/common'

import { PrismaService } from './prisma.service.js'

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
// NestJS discovers module metadata on the decorated class.
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class DatabaseModule {}
