import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import * as express from 'express';
import { AuthService } from './auth.service.js';
import { AuthGuard } from './auth.guard.js';
import { SignupDto } from './dto/signup.dto.js';
import { SigninDto } from './dto/signin.dto.js';

const COOKIE_ACCESS = 'access_token';
const COOKIE_REFRESH = 'refresh_token';
const ACCESS_MAX_AGE_SEC = 15 * 60; // 15 minutes
const REFRESH_MAX_AGE_SEC = 7 * 24 * 60 * 60; // 7 days

function cookieOptions(maxAgeSec: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: maxAgeSec * 1000,
  };
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  async signup(
    @Body() dto: SignupDto,
    @Res({ passthrough: true }) res: express.Response,
  ) {
    const result = await this.authService.signup(dto.email, dto.password);
    res.cookie(COOKIE_ACCESS, result.tokens.accessToken, cookieOptions(ACCESS_MAX_AGE_SEC));
    res.cookie(COOKIE_REFRESH, result.tokens.refreshToken, cookieOptions(REFRESH_MAX_AGE_SEC));
    return { user: { id: result.id, email: result.email } };
  }

  @Post('signin')
  async signin(
    @Body() dto: SigninDto,
    @Res({ passthrough: true }) res: express.Response,
  ) {
    const result = await this.authService.signin(dto.email, dto.password);
    res.cookie(COOKIE_ACCESS, result.tokens.accessToken, cookieOptions(ACCESS_MAX_AGE_SEC));
    res.cookie(COOKIE_REFRESH, result.tokens.refreshToken, cookieOptions(REFRESH_MAX_AGE_SEC));
    return { user: { id: result.id, email: result.email } };
  }

  @Post('refresh')
  async refresh(
    @Req() req: express.Request,
    @Res({ passthrough: true }) res: express.Response,
  ) {
    const token = req.cookies?.[COOKIE_REFRESH];
    const tokens = await this.authService.refresh(token);
    if (!tokens) {
      res.clearCookie(COOKIE_ACCESS, { path: '/' });
      res.clearCookie(COOKIE_REFRESH, { path: '/' });
      return { ok: false };
    }
    res.cookie(COOKIE_ACCESS, tokens.accessToken, cookieOptions(ACCESS_MAX_AGE_SEC));
    res.cookie(COOKIE_REFRESH, tokens.refreshToken, cookieOptions(REFRESH_MAX_AGE_SEC));
    return { ok: true };
  }

  @Post('logout')
  async logout(@Req() req: express.Request, @Res({ passthrough: true }) res: express.Response) {
    const token = req.cookies?.[COOKIE_REFRESH];
    await this.authService.logout(token);
    res.clearCookie(COOKIE_ACCESS, { path: '/' });
    res.clearCookie(COOKIE_REFRESH, { path: '/' });
    return { ok: true };
  }

  @Get('me')
  @UseGuards(AuthGuard)
  async me(@Req() req: express.Request & { user?: { userId: number } }) {
    const userId = req.user?.userId;
    const user = await this.authService.getUserById(userId!);
    if (!user) throw new UnauthorizedException();
    return { user: { id: user.id, email: user.email } };
  }
}
