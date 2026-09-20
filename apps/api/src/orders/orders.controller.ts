import type { AuthenticatedUser, OrderCreationOptions, OrderDetail, OrdersPage } from '@admin-panel/contracts'
import { Body, Controller, Get, Inject, Param, Patch, Post, Query, UseGuards } from '@nestjs/common'

import { AccessTokenGuard } from '../auth/access-token.guard.js'
import { CurrentUser } from '../auth/current-user.decorator.js'
import { OrdersService } from './orders.service.js'

@Controller('api/v1/orders')
@UseGuards(AccessTokenGuard)
export class OrdersController {
  constructor(@Inject(OrdersService) private readonly orders: OrdersService) {}

  @Get()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: Readonly<Record<string, unknown>>,
  ): Promise<OrdersPage> {
    return this.orders.list(user, query)
  }

  @Get('creation-options')
  creationOptions(@CurrentUser() user: AuthenticatedUser): Promise<OrderCreationOptions> {
    return this.orders.creationOptions(user)
  }

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() input: unknown): Promise<OrderDetail> {
    return this.orders.create(user, input)
  }

  @Patch(':id/status')
  transitionStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() input: unknown,
  ): Promise<OrderDetail> {
    return this.orders.transitionStatus(user, id, input)
  }

  @Get(':id')
  detail(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string): Promise<OrderDetail> {
    return this.orders.detail(user, id)
  }
}
