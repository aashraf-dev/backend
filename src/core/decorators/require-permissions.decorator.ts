import { SetMetadata } from '@nestjs/common';
import { Permission } from '../../shared/enums/permission.enum';

export const PERMISSIONS_KEY = 'REQUIRED_PERMISSIONS';

/**
 * Declare the permissions a caller must hold to access a route.
 * All listed permissions are required (AND logic).
 *
 * @example @RequirePermissions(Permission.APPOINTMENT_CREATE, Permission.PET_READ)
 */
export const RequirePermissions = (...permissions: Permission[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
