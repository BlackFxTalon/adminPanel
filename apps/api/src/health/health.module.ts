import { Module } from '@nestjs/common'

import { HealthController } from './health.controller.js'

@Module({ controllers: [HealthController] })
// NestJS discovers module metadata on the decorated class.
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class HealthModule {}
