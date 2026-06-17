import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { APP_CONTEXTS_KEY } from '../decorators/app-contexts.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { AppContext } from '../../shared/enums/app-context.enum';
import { IJwtPayload } from '../../shared/interfaces/jwt-payload.interface';
import { IAuthenticatedRequest } from '../../shared/interfaces/authenticated-request.interface';

/**
 * Ensures that the token's appContext matches the permitted contexts
 * declared on the route via @AppContexts(...).
 *
 * Prevents a CRM token from being used on portal routes and vice-versa.
 */
@Injectable()
export class AppContextGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const allowedContexts = this.reflector.getAllAndOverride<AppContext[]>(
      APP_CONTEXTS_KEY,
      [context.getHandler(), context.getClass()],
    );

    // No @AppContexts() → route is context-agnostic
    if (!allowedContexts || allowedContexts.length === 0) return true;

    const request = context.switchToHttp().getRequest<IAuthenticatedRequest>();
    const user: IJwtPayload = request.user;

    if (!user) return true; // JwtAuthGuard handles this

    if (!allowedContexts.includes(user.appContext)) {
      throw new ForbiddenException(
        `This endpoint is not available in the "${user.appContext}" context`,
      );
    }

    return true;
  }
}
