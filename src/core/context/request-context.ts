import { ClsService, ClsStore } from 'nestjs-cls';
import { AppContext } from '../../shared/enums/app-context.enum';

/** Type-safe keys for the CLS store — prevents magic-string bugs */
export interface IClsStore extends ClsStore {
  REQUEST_ID: string;
  TENANT_ID: string | null;
  TENANT_SCHEMA: string | null;
  TENANT_SLUG: string | null;
  APP_CONTEXT: AppContext | null;
}

/** Typed aliases over ClsService for readability in consuming code */
export class RequestContext {
  constructor(private readonly cls: ClsService<IClsStore>) {}

  get requestId(): string {
    return this.cls.get('REQUEST_ID') ?? 'unknown';
  }

  get tenantId(): string | null {
    return this.cls.get('TENANT_ID') ?? null;
  }

  get tenantSchema(): string | null {
    return this.cls.get('TENANT_SCHEMA') ?? null;
  }

  get tenantSlug(): string | null {
    return this.cls.get('TENANT_SLUG') ?? null;
  }

  get appContext(): AppContext | null {
    return this.cls.get('APP_CONTEXT') ?? null;
  }

  /** Throws if no tenant is in context — use in tenant-scoped operations */
  requireTenantSchema(): string {
    const schema = this.tenantSchema;
    if (!schema)
      throw new Error('Tenant schema required but not set in request context');
    return schema;
  }
}
