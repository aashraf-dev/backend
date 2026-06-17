export const CacheKeys = {
  // ── Auth & Sessions ──────────────────────────────────────────────
  SESSION: (sessionId: string) => `auth:session:${sessionId}`,
  REFRESH_TOKEN: (userId: string, sessionId: string) =>
    `auth:refresh:${userId}:${sessionId}`,
  TOKEN_BLACKLIST: (jti: string) => `auth:blacklist:${jti}`,
  MFA_ATTEMPTS: (userId: string) => `mfa:attempts:${userId}`,
  PASSWORD_RESET: (token: string) => `auth:reset:${token}`,

  // ── User Profile ─────────────────────────────────────────────────
  CURRENT_USER: (userId: string, tenantSchema: string | null) =>
    `user:profile:${userId}:${tenantSchema ?? 'platform'}`,

  // ── Tenant Lookup ─────────────────────────────────────────────────
  TENANT_BY_SLUG: (slug: string) => `tenant:slug:${slug}`,
  TENANT_BY_ID: (tenantId: string) => `tenant:id:${tenantId}`,

  // ── Permission Resolution ─────────────────────────────────────────
  USER_PERMISSIONS: (userId: string, tenantSchema: string) =>
    `perms:user:${userId}:${tenantSchema}`,
  ROLE_PERMISSIONS: (roleId: string, tenantSchema: string) =>
    `perms:role:${roleId}:${tenantSchema}`,
  DEPARTMENT_ROLES: (departmentId: string, tenantSchema: string) =>
    `perms:dept:${departmentId}:${tenantSchema}`,
  DESIGNATION_ROLES: (designationId: string, tenantSchema: string) =>
    `perms:desig:${designationId}:${tenantSchema}`,
  DEPARTMENT_MEMBERS: (departmentId: string, tenantSchema: string) =>
    `perms:dept-members:${departmentId}:${tenantSchema}`,
  DESIGNATION_HOLDERS: (designationId: string, tenantSchema: string) =>
    `perms:desig-holders:${designationId}:${tenantSchema}`,
} as const;
