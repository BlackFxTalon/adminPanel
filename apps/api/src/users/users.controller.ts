import type { AuthenticatedUser, UsersPage } from '@admin-panel/contracts'
import { Controller, Get, Inject, Query, UseGuards } from '@nestjs/common'

import { AccessTokenGuard } from '../auth/access-token.guard.js'
import { CurrentUser } from '../auth/current-user.decorator.js'
import { UsersService } from './users.service.js'

@Controller('api/v1/users')
@UseGuards(AccessTokenGuard)
export class UsersController {
  constructor(@Inject(UsersService) private readonly users: UsersService) {}

  @Get()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: Readonly<Record<string, unknown>>,
  ): Promise<UsersPage> {
    return this.users.list(user, query)
  }
}
