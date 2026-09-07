import type { AuthenticatedUser } from '@admin-panel/contracts'
import { type CanActivate, type ExecutionContext, Inject, Injectable } from '@nestjs/common'
import type { Request } from 'express'

import { readBearerToken } from './access-token.js'
import { AuthService } from './auth.service.js'

export interface AuthenticatedRequest extends Request {
  authenticatedUser: AuthenticatedUser
}

@Injectable()
export class AccessTokenGuard implements CanActivate {
  constructor(@Inject(AuthService) private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>()
    request.authenticatedUser = await this.authService.currentUser(readBearerToken(request.headers.authorization))
    return true
  }
}
