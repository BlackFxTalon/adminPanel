import { Controller, Get } from '@nestjs/common'

@Controller('api/v1/health')
export class HealthController {
  @Get()
  check(): { status: 'ok' } {
    return { status: 'ok' }
  }
}
