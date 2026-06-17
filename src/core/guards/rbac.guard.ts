import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/require-permissions.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { Permission } from '../../shared/enums/permission.enum';
import { IJwtPayload } from '../../shared/interfaces/jwt-payload.interface';
import { IAuthenticatedRequest } from '../../shared/interfaces/authenticated-request.interface';
import { UserType } from '../../shared/enums/user-type.enum';

@Injectable()
export class RbacGuard implements CanActivate {
  private readonly logger = new Logger(RbacGuard.name);

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Public routes bypass RBAC
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    // Get required permissions from @RequirePermissions() decorator
    const required = this.reflector.getAllAndOverride<Permission[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    // No @RequirePermissions() → route is authenticated but no specific permission needed
    if (!required || required.length === 0) return true;

    const request = context.switchToHttp().getRequest<IAuthenticatedRequest>();
    const user: IJwtPayload = request.user;

    if (!user) {
      throw new ForbiddenException('No authentication context');
    }

    // Platform super admins bypass all tenant permission checks
    if (user.userType === UserType.PLATFORM_SUPER_ADMIN) return true;

    const hasAll = required.every((perm) => user.permissions.includes(perm));

    if (!hasAll) {
      const missing = required.filter((p) => !user.permissions.includes(p));
      this.logger.warn(
        `User ${user.sub} missing permissions: [${missing.join(', ')}] on ${context.getClass().name}.${context.getHandler().name}`,
      );
      throw new ForbiddenException(
        'You do not have permission to perform this action',
      );
    }

    return true;
  }
}
