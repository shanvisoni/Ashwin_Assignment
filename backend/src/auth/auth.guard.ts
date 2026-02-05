import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { verifyAccessToken } from '../common/token.util';

@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const token = request.cookies?.access_token;
    if (!token) {
      throw new UnauthorizedException('Missing or invalid token');
    }
    try {
      const userId = verifyAccessToken(token);
      (request as Request & { user: { userId: number } }).user = { userId };
      return true;
    } catch {
      throw new UnauthorizedException('Missing or invalid token');
    }
  }
}
