import type { AuthenticatedUser, LoginRequest } from '@admin-panel/contracts'
import { Body, Controller, Get, Headers, HttpCode, Inject, Post, Req, Res } from '@nestjs/common'
import type { CookieOptions, Request, Response } from 'express'

import { REFRESH_COOKIE_NAME, REFRESH_COOKIE_PATH, REFRESH_TTL_MS } from './auth.constants.js'
import { AuthService } from './auth.service.js'

const refreshCookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: 'strict',
  path: REFRESH_COOKIE_PATH,
} satisfies CookieOptions

function readCookie(request: Request, name: string): string | undefined {
  const entry = request.headers.cookie
    ?.split(';')
    .map(value => value.trim().split('='))
    .find(([cookieName]) => cookieName === name)
  return entry?.[1] ? decodeURIComponent(entry[1]) : undefined
}

function readBearerToken(authorization: string | undefined): string {
  if (!authorization?.startsWith('Bearer ')) return ''
  return authorization.slice('Bearer '.length)
}

function setRefreshCookie(response: Response, token: string): void {
  response.cookie(REFRESH_COOKIE_NAME, token, {
    ...refreshCookieOptions,
    maxAge: REFRESH_TTL_MS,
  })
}

@Controller('api/v1/auth')
export class AuthController {
  constructor(@Inject(AuthService) private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() credentials: LoginRequest, @Res({ passthrough: true }) response: Response) {
    const { refreshToken, ...session } = await this.authService.login(credentials)
    setRefreshCookie(response, refreshToken)
    return session
  }

  @Post('refresh')
  async refresh(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const { refreshToken, ...session } = await this.authService.refresh(readCookie(request, REFRESH_COOKIE_NAME))
    setRefreshCookie(response, refreshToken)
    return session
  }

  @Get('me')
  currentUser(@Headers('authorization') authorization: string | undefined): Promise<AuthenticatedUser> {
    return this.authService.currentUser(readBearerToken(authorization))
  }

  @Post('logout')
  @HttpCode(204)
  logout(@Req() request: Request, @Res({ passthrough: true }) response: Response): void {
    this.authService.logout(readCookie(request, REFRESH_COOKIE_NAME))
    response.clearCookie(REFRESH_COOKIE_NAME, refreshCookieOptions)
  }
}