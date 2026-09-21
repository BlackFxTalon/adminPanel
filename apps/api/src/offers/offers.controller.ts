import type { AuthenticatedUser, OffersPage } from '@admin-panel/contracts'
import { Controller, Get, Inject, Query, UseGuards } from '@nestjs/common'

import { AccessTokenGuard } from '../auth/access-token.guard.js'
import { CurrentUser } from '../auth/current-user.decorator.js'
import { OffersService } from './offers.service.js'

@Controller('api/v1/offers')
@UseGuards(AccessTokenGuard)
export class OffersController {
  constructor(@Inject(OffersService) private readonly offers: OffersService) {}

  @Get()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: Readonly<Record<string, unknown>>,
  ): Promise<OffersPage> {
    return this.offers.list(user, query)
  }
}
