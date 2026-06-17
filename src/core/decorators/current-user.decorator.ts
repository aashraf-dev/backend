import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { IJwtPayload } from '../../shared/interfaces/jwt-payload.interface';
import { IAuthenticatedRequest } from '../../shared/interfaces/authenticated-request.interface';

/**
 * Extract the authenticated user from the request.
 *
 * @example async getProfile(@CurrentUser() user: IJwtPayload) { ... }
 * @example async getProfile(@CurrentUser('sub') userId: string) { ... }
 */
export const CurrentUser = createParamDecorator(
  (field: keyof IJwtPayload | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<IAuthenticatedRequest>();
    const user = request.user;
    return field ? user?.[field] : user;
  },
);
