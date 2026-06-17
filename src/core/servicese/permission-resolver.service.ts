import { Injectable, Logger } from '@nestjs/common';
import { TenantConnectionService } from '../../database/tenant-connection.service';
import { RedisService } from '../../shared/redis/redis.service';
import { CacheKeys } from '../../shared/constants/cache-keys.constant';
import { CacheTTL } from '../../shared/constants/cache-ttl.constant';

interface IResolvedPermissions {
  keys: string[];
  resolvedAt: string;
}

/**
 * Single source of truth for computing a user's effective permissions.
 *
 * Resolution order (all paths merged via SQL UNION, then overrides applied):
 *   1. Direct role assignments   (user_roles → role_permissions)
 *   2. Department roles          (user_departments → department_roles → role_permissions)
 *   3. Designation roles         (users.designation_id → designation_roles → role_permissions)
 *   4. Individual GRANT overrides (user_permission_overrides WHERE type = 'grant')
 *   5. Subtract DENY overrides   (user_permission_overrides WHERE type = 'deny')
 *
 * Result is cached in Redis. Every mutation to the resolution inputs
 * (role assignments, department changes, etc.) MUST call the appropriate
 * invalidation method so the next request gets fresh data.
 */
@Injectable()
export class PermissionResolverService {
  private readonly logger = new Logger(PermissionResolverService.name);

  constructor(
    private readonly tenantConnectionService: TenantConnectionService,
    private readonly redis: RedisService,
  ) {}

  // ── Public API ────────────────────────────────────────────────────

  /**
   * Get the full resolved permission key set for a user.
   * Returns from Redis if fresh, otherwise runs the DB resolution query.
   */
  async resolveForUser(
    userId: string,
    tenantSchema: string,
  ): Promise<string[]> {
    const cacheKey = CacheKeys.USER_PERMISSIONS(userId, tenantSchema);

    const cached = await this.redis.getJson<IResolvedPermissions>(cacheKey);
    if (cached) return cached.keys;

    const keys = await this.resolveFromDatabase(userId, tenantSchema);

    await this.redis.setJson<IResolvedPermissions>(
      cacheKey,
      { keys, resolvedAt: new Date().toISOString() },
      CacheTTL.USER_PERMISSIONS,
    );

    return keys;
  }

  /**
   * Quick boolean check — avoids returning the full array when only
   * a single permission needs to be verified (used in non-JWT flows).
   */
  async userHasPermission(
    userId: string,
    tenantSchema: string,
    permissionKey: string,
  ): Promise<boolean> {
    const keys = await this.resolveForUser(userId, tenantSchema);
    return keys.includes(permissionKey);
  }

  // ── Cache invalidation ─────────────────────────────────────────────

  /**
   * Call after: user role assigned/removed, user department changed,
   * user designation changed, user permission override added/removed.
   */
  async invalidateUserPermissions(
    userId: string,
    tenantSchema: string,
  ): Promise<void> {
    await this.redis.del(CacheKeys.USER_PERMISSIONS(userId, tenantSchema));
    this.logger.debug(`Permission cache cleared for user ${userId}`);
  }

  /**
   * Call after: a role's permissions are changed.
   * Clears the role cache AND all users who held that role.
   */
  async invalidateRolePermissions(
    roleId: string,
    tenantSchema: string,
  ): Promise<void> {
    await this.redis.del(CacheKeys.ROLE_PERMISSIONS(roleId, tenantSchema));

    // Bulk-invalidate all users whose effective permissions include this role
    const affectedUsers = await this.getUsersWithRole(roleId, tenantSchema);
    await this.bulkInvalidateUsers(affectedUsers, tenantSchema);

    this.logger.debug(
      `Role ${roleId} permission cache cleared — invalidated ${affectedUsers.length} user caches`,
    );
  }

  /**
   * Call after: a department's role assignments change.
   */
  async invalidateDepartmentPermissions(
    departmentId: string,
    tenantSchema: string,
  ): Promise<void> {
    await this.redis.del(
      CacheKeys.DEPARTMENT_ROLES(departmentId, tenantSchema),
    );

    const members = await this.getDepartmentMembers(departmentId, tenantSchema);
    await this.bulkInvalidateUsers(members, tenantSchema);

    this.logger.debug(
      `Department ${departmentId} cache cleared — invalidated ${members.length} user caches`,
    );
  }

  /**
   * Call after: a designation's role assignments change.
   */
  async invalidateDesignationPermissions(
    designationId: string,
    tenantSchema: string,
  ): Promise<void> {
    await this.redis.del(
      CacheKeys.DESIGNATION_ROLES(designationId, tenantSchema),
    );

    const holders = await this.getDesignationHolders(
      designationId,
      tenantSchema,
    );
    await this.bulkInvalidateUsers(holders, tenantSchema);

    this.logger.debug(
      `Designation ${designationId} cache cleared — invalidated ${holders.length} user caches`,
    );
  }

  // ── Private: DB resolution ────────────────────────────────────────

  /**
   * Single optimised query that resolves permissions through ALL paths:
   * direct roles + department roles + designation roles, then applies overrides.
   *
   * Uses CTEs for readability without sacrificing performance —
   * Postgres flattens these efficiently with the query planner.
   */
  private async resolveFromDatabase(
    userId: string,
    tenantSchema: string,
  ): Promise<string[]> {
    return this.tenantConnectionService.runInTenantSchema(
      tenantSchema,
      async (em) => {
        const result: Array<{ key: string }> = await em.query(
          `
          WITH
          -- 1. Roles assigned directly to the user
          direct_roles AS (
            SELECT ur.role_id
            FROM user_roles ur
            WHERE ur.user_id = $1
          ),

          -- 2. Roles inherited from the user's departments
          department_roles_for_user AS (
            SELECT dr.role_id
            FROM user_departments ud
            INNER JOIN department_roles dr ON dr.department_id = ud.department_id
            WHERE ud.user_id = $1
          ),

          -- 3. Roles inherited from the user's designation
          designation_roles_for_user AS (
            SELECT dgr.role_id
            FROM users u
            INNER JOIN designation_roles dgr ON dgr.designation_id = u.designation_id
            WHERE u.id = $1
              AND u.designation_id IS NOT NULL
          ),

          -- Merge all role sources (UNION deduplicates)
          all_effective_roles AS (
            SELECT role_id FROM direct_roles
            UNION
            SELECT role_id FROM department_roles_for_user
            UNION
            SELECT role_id FROM designation_roles_for_user
          ),

          -- 4. All permission keys from those roles (active roles only)
          role_based_permissions AS (
            SELECT DISTINCT p.key
            FROM role_permissions rp
            INNER JOIN permissions p ON p.id = rp.permission_id
            INNER JOIN roles r ON r.id = rp.role_id
            WHERE rp.role_id IN (SELECT role_id FROM all_effective_roles)
              AND r.is_active = TRUE
          ),

          -- 5. Individually granted permissions (non-expired)
          user_grants AS (
            SELECT p.key
            FROM user_permission_overrides upo
            INNER JOIN permissions p ON p.id = upo.permission_id
            WHERE upo.user_id = $1
              AND upo.type = 'grant'
              AND (upo.expires_at IS NULL OR upo.expires_at > NOW())
          ),

          -- 6. Individually denied permissions (non-expired)
          user_denies AS (
            SELECT p.key
            FROM user_permission_overrides upo
            INNER JOIN permissions p ON p.id = upo.permission_id
            WHERE upo.user_id = $1
              AND upo.type = 'deny'
              AND (upo.expires_at IS NULL OR upo.expires_at > NOW())
          ),

          -- 7. Union role permissions with individual grants
          combined AS (
            SELECT key FROM role_based_permissions
            UNION
            SELECT key FROM user_grants
          )

          -- 8. Subtract explicit denies → final permission set
          SELECT combined.key
          FROM combined
          WHERE combined.key NOT IN (SELECT key FROM user_denies)
          ORDER BY combined.key
          `,
          [userId],
        );

        return result.map((row) => row.key);
      },
    );
  }

  // ── Private: bulk invalidation helpers ────────────────────────────

  private async bulkInvalidateUsers(
    userIds: string[],
    tenantSchema: string,
  ): Promise<void> {
    if (userIds.length === 0) return;
    const keys = userIds.map((id) =>
      CacheKeys.USER_PERMISSIONS(id, tenantSchema),
    );
    await this.redis.del(...keys);
  }

  private async getUsersWithRole(
    roleId: string,
    tenantSchema: string,
  ): Promise<string[]> {
    return this.tenantConnectionService.runInTenantSchema(
      tenantSchema,
      async (em) => {
        // Users directly assigned the role
        const direct: Array<{ user_id: string }> = await em.query(
          `SELECT user_id FROM user_roles WHERE role_id = $1`,
          [roleId],
        );

        // Users whose department has this role
        const viaDept: Array<{ user_id: string }> = await em.query(
          `SELECT DISTINCT ud.user_id
           FROM department_roles dr
           INNER JOIN user_departments ud ON ud.department_id = dr.department_id
           WHERE dr.role_id = $1`,
          [roleId],
        );

        // Users whose designation has this role
        const viaDesig: Array<{ id: string }> = await em.query(
          `SELECT DISTINCT u.id
           FROM designation_roles dgr
           INNER JOIN users u ON u.designation_id = dgr.designation_id
           WHERE dgr.role_id = $1`,
          [roleId],
        );

        const ids = new Set([
          ...direct.map((r) => r.user_id),
          ...viaDept.map((r) => r.user_id),
          ...viaDesig.map((r) => r.id),
        ]);
        return Array.from(ids);
      },
    );
  }

  private async getDepartmentMembers(
    departmentId: string,
    tenantSchema: string,
  ): Promise<string[]> {
    const cached = await this.redis.getJson<string[]>(
      CacheKeys.DEPARTMENT_MEMBERS(departmentId, tenantSchema),
    );
    if (cached) return cached;

    return this.tenantConnectionService.runInTenantSchema(
      tenantSchema,
      async (em) => {
        const rows: Array<{ user_id: string }> = await em.query(
          `SELECT user_id FROM user_departments WHERE department_id = $1`,
          [departmentId],
        );
        const ids = rows.map((r) => r.user_id);
        await this.redis.setJson(
          CacheKeys.DEPARTMENT_MEMBERS(departmentId, tenantSchema),
          ids,
          CacheTTL.DEPARTMENT_MEMBERS,
        );
        return ids;
      },
    );
  }

  private async getDesignationHolders(
    designationId: string,
    tenantSchema: string,
  ): Promise<string[]> {
    const cached = await this.redis.getJson<string[]>(
      CacheKeys.DESIGNATION_HOLDERS(designationId, tenantSchema),
    );
    if (cached) return cached;

    return this.tenantConnectionService.runInTenantSchema(
      tenantSchema,
      async (em) => {
        const rows: Array<{ id: string }> = await em.query(
          `SELECT id FROM users WHERE designation_id = $1`,
          [designationId],
        );
        const ids = rows.map((r) => r.id);
        await this.redis.setJson(
          CacheKeys.DESIGNATION_HOLDERS(designationId, tenantSchema),
          ids,
          CacheTTL.DESIGNATION_HOLDERS,
        );
        return ids;
      },
    );
  }
}
