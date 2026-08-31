import 'reflect-metadata'

import { NestFactory } from '@nestjs/core'

import { AppModule } from '../dist/app.module.js'
import { readAuthTestEnvironment } from './auth-test-environment'

export default async function startApi(): Promise<() => Promise<void>> {
  readAuthTestEnvironment()

  const app = await NestFactory.create(AppModule, { logger: false })
  await app.listen(3001, '127.0.0.1')
  return async () => app.close()
}