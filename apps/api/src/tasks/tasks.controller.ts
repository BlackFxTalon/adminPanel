import type { AuthenticatedUser, TaskCreationOptions, TaskDetail, TasksPage } from '@admin-panel/contracts'
import { Body, Controller, Get, Inject, Post, Query, UseGuards } from '@nestjs/common'

import { AccessTokenGuard } from '../auth/access-token.guard.js'
import { CurrentUser } from '../auth/current-user.decorator.js'
import { TasksService } from './tasks.service.js'

@Controller('api/v1/tasks')
@UseGuards(AccessTokenGuard)
export class TasksController {
  constructor(@Inject(TasksService) private readonly tasks: TasksService) {}

  @Get()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: Readonly<Record<string, unknown>>,
  ): Promise<TasksPage> {
    return this.tasks.list(user, query)
  }

  @Get('creation-options')
  creationOptions(@CurrentUser() user: AuthenticatedUser): Promise<TaskCreationOptions> {
    return this.tasks.creationOptions(user)
  }

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() input: unknown): Promise<TaskDetail> {
    return this.tasks.create(user, input)
  }
}
