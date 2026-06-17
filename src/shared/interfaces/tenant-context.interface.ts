import { AppContext } from '../enums/app-context.enum';

export interface ITenantContext {
  /** Resolved tenant UUID from DB */
  tenantId: string;

  /** Postgres schema e.g. "tenant_happypaws" */
  tenantSchema: string;

  /** Subdomain slug e.g. "happypaws" */
  tenantSlug: string;

  /** App surface resolved from subdomain */
  appContext: AppContext;

  /** Unique ID per request for tracing */
  requestId: string;
}
