import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { IClsStore } from '../../../core/context/request-context';
import { AppContext } from '../../../shared/enums/app-context.enum';
import { IJwtPayload } from '../../../shared/interfaces/jwt-payload.interface';
import {
  UserType,
  CLINIC_STAFF_TYPES,
} from '../../../shared/enums/user-type.enum';

/**
 * Thin wrapper over the CLS store for use inside CRM services.
 * Avoids duplicating the cls.get() pattern in every service method.
 */
@Injectable()
export class CrmContextService {
  constructor(private readonly cls: ClsService<IClsStore>) {}

  /** Throws if called outside a tenant-scoped request */
  getSchema(): string {
    const schema = this.cls.get('TENANT_SCHEMA');
    if (!schema) {
      throw new InternalServerErrorException(
        'Tenant schema not available — request has no tenant context',
      );
    }
    return schema;
  }

  getTenantId(): string {
    const id = this.cls.get('TENANT_ID');
    if (!id) {
      throw new InternalServerErrorException(
        'Tenant ID not available in request context',
      );
    }
    return id;
  }

  getAppContext(): AppContext {
    return this.cls.get('APP_CONTEXT') ?? AppContext.CRM;
  }

  /** True when the requesting user is a clinic owner or manager */
  isManagerOrAbove(user: IJwtPayload): boolean {
    return (
      user.userType === UserType.CLINIC_OWNER ||
      user.userType === UserType.CLINIC_MANAGER
    );
  }

  /** True when the user is a vet-level staff member */
  isClinicalStaff(user: IJwtPayload): boolean {
    return (
      user.userType === UserType.VETERINARIAN ||
      user.userType === UserType.VET_INTERN
    );
  }
}
