/** Named DataSource for platform-level entities (public schema) */
export const DATA_SOURCE_PLATFORM = 'platform' as const;

/** Named DataSource for tenant entities (schema set per-request via search_path) */
export const DATA_SOURCE_TENANT = 'tenant' as const;

/** Prefix for all tenant Postgres schemas */
export const TENANT_SCHEMA_PREFIX = 'tenant_' as const;

/** Build the Postgres schema name from a tenant slug */
export const buildSchemaName = (slug: string): string =>
  `${TENANT_SCHEMA_PREFIX}${slug.toLowerCase().replace(/[^a-z0-9_]/g, '_')}`;
