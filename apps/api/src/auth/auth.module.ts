import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'

import { AuthController } from './auth.controller.js'
import { AuthService } from './auth.service.js'
import { RefreshSessionStore } from './refresh-session.store.js'

@Module({
  imports: [
    JwtModule.registerAsync({
      useFactory: () => {
        const secret = process.env.AUTH_JWT_SECRET
        if (!secret || secret.length < 32) {
          throw new Error('AUTH_JWT_SECRET must contain at least 32 characters')
        }
        return { secret }
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, RefreshSessionStore],
})
// NestJS discovers module metadata on the decorated class.
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class AuthModule {}