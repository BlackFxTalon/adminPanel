import type { AuthenticatedUser } from '@admin-panel/contracts'
import { Controller, Get, Inject, Query, UseGuards } from '@nestjs/common'

import type { ContragentDirectoryPage, ContragentKind, ContragentLookupItem } from './contragents.types.js'
import { AccessTokenGuard } from '../auth/access-token.guard.js'
import { CurrentUser } from '../auth/current-user.decorator.js'
import { ContragentsService } from './contragents.service.js'

@Controller('api/v1/contragents')
@UseGuards(AccessTokenGuard)
export class ContragentsController {
  constructor(@Inject(ContragentsService) private readonly contragents: ContragentsService) {}

  @Get('lookup')
  lookup(
    @CurrentUser() user: AuthenticatedUser,
    @Query('kind') kind: string | undefined,
  ): Promise<readonly ContragentLookupItem[]> {
    const parsedKind = kind === 'company' || kind === 'contact' ? kind : undefined
    return this.contragents.lookup(user, parsedKind)
  }

  @Get()
  directory(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: Readonly<Record<string, unknown>>,
  ): Promise<ContragentDirectoryPage> {
    const page = Number(query.page ?? 1)
    const pageSize = Number(query.pageSize ?? 10)
    const search = typeof query.search === 'string' && query.search.trim() ? query.search : undefined
    const kind = typeof query.kind === 'string' && ['company', 'contact'].includes(query.kind)
      ? query.kind as ContragentKind
      : undefined
    return this.contragents.directory(user, {
      page,
      pageSize,
      ...(search ? { search } : {}),
      ...(kind ? { kind } : {}),
    })
  }
}

export type { ContragentDirectoryPage, ContragentDirectoryQuery, ContragentKind, ContragentLookupItem } from './contragents.types.js'
