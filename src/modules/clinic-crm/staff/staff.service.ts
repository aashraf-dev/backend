import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';

import { TenantConnectionService } from '../../../database/tenant-connection.service';
import { TenantRepositoryFactory } from '../../../database/tenant-repository';
import { UserEntity } from '../../../database/entities/tenant/user.entity';
import { UserRoleEntity } from '../../../database/entities/tenant/user-role.entity';
import { UserDepartmentEntity } from '../../../database/entities/tenant/user-department.entity';
import { RoleEntity } from '../../../database/entities/tenant/role.entity';
import { DepartmentEntity } from '../../../database/entities/tenant/department.entity';
import { DesignationEntity } from '../../../database/entities/tenant/designation.entity';
import { PermissionEntity } from '../../../database/entities/tenant/permission.entity';
import { UserPermissionOverrideEntity } from '../../../database/entities/tenant/user-permission-override.entity';

import { PermissionResolverService } from 'src/core/servicese/permission-resolver.service';
import { CrmContextService } from '../common/crm-context.service';
import { RedisService } from '../../../shared/redis/redis.service';
import { CacheKeys } from '../../../shared/constants/cache-keys.constant';
import {
  UserType,
  CLINIC_STAFF_TYPES,
} from '../../../shared/enums/user-type.enum';
import { IJwtPayload } from '../../../shared/interfaces/jwt-payload.interface';
import {
  IPaginatedResponse,
  buildPaginatedResponse,
} from '../../../shared/dto/paginated-response.interface';

import {
  CreateStaffDto,
  UpdateStaffDto,
  AssignRoleDto,
  AssignDepartmentDto,
  SetDesignationDto,
  AddPermissionOverrideDto,
  StaffQueryDto,
  StaffSortBy,
} from './dto';

@Injectable()
export class StaffService {
  private readonly logger = new Logger(StaffService.name);
  private readonly bcryptRounds: number;

  constructor(
    private readonly crmCtx: CrmContextService,
    private readonly repoFactory: TenantRepositoryFactory,
    private readonly tenantConn: TenantConnectionService,
    private readonly permissionResolver: PermissionResolverService,
    private readonly redis: RedisService,
    private readonly configService: ConfigService,
  ) {
    this.bcryptRounds = this.configService.get<number>('auth.bcryptRounds')!;
  }

  // ── Create ───────────────────────────────────────────────────────

  async create(dto: CreateStaffDto, actor: IJwtPayload): Promise<UserEntity> {
    const schema = this.crmCtx.getSchema();

    this.assertClinicStaffType(dto.userType);
    this.assertCanManageUserType(dto.userType, actor);

    const userRepo = this.repoFactory.for(UserEntity, schema);

    const existing = await userRepo.findOne({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException(
        `Staff member with email "${dto.email}" already exists`,
      );
    }

    // Validate FKs before creating
    if (dto.designationId)
      await this.assertDesignationExists(dto.designationId, schema);
    if (dto.roleIds?.length) await this.assertRolesExist(dto.roleIds, schema);
    if (dto.departmentIds?.length)
      await this.assertDepartmentsExist(dto.departmentIds, schema);

    if (
      dto.primaryDepartmentId &&
      dto.departmentIds &&
      !dto.departmentIds.includes(dto.primaryDepartmentId)
    ) {
      throw new BadRequestException(
        'primaryDepartmentId must be included in departmentIds',
      );
    }

    const passwordHash = await bcrypt.hash(dto.password, this.bcryptRounds);

    const savedUser = await this.tenantConn.runInTenantSchema(
      schema,
      async (em) => {
        const user = em.create(UserEntity, {
          email: dto.email,
          passwordHash,
          firstName: dto.firstName,
          lastName: dto.lastName,
          userType: dto.userType,
          designationId: dto.designationId ?? null,
          isActive: true,
          isEmailVerified: false,
        });
        const saved = await em.save(UserEntity, user);

        // Assign roles
        if (dto.roleIds?.length) {
          const roleEntities = dto.roleIds.map((roleId) =>
            em.create(UserRoleEntity, {
              userId: saved.id,
              roleId,
              assignedBy: actor.sub,
            }),
          );
          await em.save(UserRoleEntity, roleEntities);
        }

        // Assign departments
        if (dto.departmentIds?.length) {
          const deptEntities = dto.departmentIds.map((departmentId) =>
            em.create(UserDepartmentEntity, {
              userId: saved.id,
              departmentId,
              isPrimary:
                departmentId ===
                (dto.primaryDepartmentId ?? dto.departmentIds![0]),
              assignedBy: actor.sub,
            }),
          );
          await em.save(UserDepartmentEntity, deptEntities);
        }

        return saved;
      },
    );

    this.logger.log(
      `Staff member created: ${savedUser.id} by ${actor.sub} in ${schema}`,
    );
    return savedUser;
  }

  // ── Read ──────────────────────────────────────────────────────────

  async findAll(
    query: StaffQueryDto,
  ): Promise<IPaginatedResponse<Record<string, unknown>>> {
    const schema = this.crmCtx.getSchema();

    return this.tenantConn.runInTenantSchema(schema, async (em) => {
      const sortMap: Record<StaffSortBy, string> = {
        [StaffSortBy.FIRST_NAME]: 'u.first_name',
        [StaffSortBy.LAST_NAME]: 'u.last_name',
        [StaffSortBy.EMAIL]: 'u.email',
        [StaffSortBy.CREATED_AT]: 'u.created_at',
        [StaffSortBy.LAST_LOGIN]: 'u.last_login_at',
      };

      const qb = em
        .createQueryBuilder(UserEntity, 'u')
        .leftJoin('u.designation', 'd')
        .addSelect(['d.id', 'd.name'])
        .where('u.deleted_at IS NULL')
        .andWhere('u.user_type != :petOwner', { petOwner: UserType.PET_OWNER });

      if (query.search) {
        qb.andWhere(
          '(u.first_name ILIKE :s OR u.last_name ILIKE :s OR u.email ILIKE :s)',
          { s: `%${query.search}%` },
        );
      }

      if (query.userType) {
        qb.andWhere('u.user_type = :userType', { userType: query.userType });
      }

      if (query.isActive !== undefined) {
        qb.andWhere('u.is_active = :isActive', { isActive: query.isActive });
      }

      if (query.designationId) {
        qb.andWhere('u.designation_id = :designationId', {
          designationId: query.designationId,
        });
      }

      if (query.departmentId) {
        qb.innerJoin(
          'user_departments',
          'ud',
          'ud.user_id = u.id AND ud.department_id = :departmentId',
          { departmentId: query.departmentId },
        );
      }

      qb.orderBy(
        sortMap[query.sortBy ?? StaffSortBy.FIRST_NAME],
        query.sortOrder ?? 'ASC',
      )
        .skip(query.skip)
        .take(query.limit);

      const [items, total] = await qb.getManyAndCount();

      const safe = items.map(
        ({ passwordHash, mfaSecret, ...rest }: any) => rest,
      );
      return buildPaginatedResponse(safe, total, query.page, query.limit);
    });
  }

  async findOne(id: string): Promise<Record<string, unknown>> {
    const schema = this.crmCtx.getSchema();

    return this.tenantConn.runInTenantSchema(schema, async (em) => {
      const result: any[] = await em.query(
        `SELECT
          u.id, u.email, u.first_name, u.last_name, u.user_type,
          u.is_active, u.is_email_verified, u.mfa_enabled,
          u.last_login_at, u.last_login_ip, u.created_at, u.updated_at,
          u.failed_login_attempts, u.locked_until,
          d.id   AS desig_id,    d.name  AS desig_name,
          dp.id  AS dept_id,     dp.name AS dept_name, ud.is_primary,
          r.id   AS role_id,     r.name  AS role_name,  r.display_name AS role_display_name
         FROM users u
         LEFT JOIN designations d ON d.id = u.designation_id
         LEFT JOIN user_departments ud ON ud.user_id = u.id
         LEFT JOIN departments dp ON dp.id = ud.department_id
         LEFT JOIN user_roles ur ON ur.user_id = u.id
         LEFT JOIN roles r ON r.id = ur.role_id
         WHERE u.id = $1 AND u.deleted_at IS NULL`,
        [id],
      );

      if (!result.length)
        throw new NotFoundException(`Staff member "${id}" not found`);

      const first = result[0];

      const deptSeen = new Set<string>();
      const departments = result
        .filter((r) => r.dept_id)
        .filter((r) => {
          if (deptSeen.has(r.dept_id)) return false;
          deptSeen.add(r.dept_id);
          return true;
        })
        .map((r) => ({
          id: r.dept_id,
          name: r.dept_name,
          isPrimary: r.is_primary,
        }));

      const roleSeen = new Set<string>();
      const roles = result
        .filter((r) => r.role_id)
        .filter((r) => {
          if (roleSeen.has(r.role_id)) return false;
          roleSeen.add(r.role_id);
          return true;
        })
        .map((r) => ({
          id: r.role_id,
          name: r.role_name,
          displayName: r.role_display_name,
        }));

      return {
        id: first.id,
        email: first.email,
        firstName: first.first_name,
        lastName: first.last_name,
        userType: first.user_type,
        isActive: first.is_active,
        isEmailVerified: first.is_email_verified,
        mfaEnabled: first.mfa_enabled,
        lastLoginAt: first.last_login_at,
        lastLoginIp: first.last_login_ip,
        createdAt: first.created_at,
        updatedAt: first.updated_at,
        failedLoginAttempts: first.failed_login_attempts,
        lockedUntil: first.locked_until,
        designation: first.desig_id
          ? { id: first.desig_id, name: first.desig_name }
          : null,
        departments,
        roles,
      };
    });
  }

  // ── Update ────────────────────────────────────────────────────────

  async update(
    id: string,
    dto: UpdateStaffDto,
    actor: IJwtPayload,
  ): Promise<Record<string, unknown>> {
    const schema = this.crmCtx.getSchema();
    await this.assertStaffExists(id, schema);
    this.assertNotSelf(
      id,
      actor,
      'Cannot update your own profile via staff management',
    );

    if (dto.designationId)
      await this.assertDesignationExists(dto.designationId, schema);
    if (dto.userType) {
      this.assertClinicStaffType(dto.userType);
      this.assertCanManageUserType(dto.userType, actor);
    }

    const repo = this.repoFactory.for(UserEntity, schema);
    await repo.update(id, {
      ...(dto.firstName !== undefined && { firstName: dto.firstName }),
      ...(dto.lastName !== undefined && { lastName: dto.lastName }),
      ...(dto.userType !== undefined && { userType: dto.userType }),
      ...(dto.designationId !== undefined && {
        designationId: dto.designationId,
      }),
    });

    if (dto.designationId !== undefined) {
      await this.permissionResolver.invalidateUserPermissions(id, schema);
    }
    await this.redis.del(CacheKeys.CURRENT_USER(id, schema));

    return this.findOne(id);
  }

  // ── Activate / Deactivate ────────────────────────────────────────

  async setActive(
    id: string,
    isActive: boolean,
    actor: IJwtPayload,
  ): Promise<void> {
    const schema = this.crmCtx.getSchema();
    this.assertNotSelf(id, actor, 'Cannot deactivate your own account');

    await this.assertStaffExists(id, schema);
    await this.repoFactory.for(UserEntity, schema).update(id, { isActive });

    if (!isActive) {
      await this.permissionResolver.invalidateUserPermissions(id, schema);
      await this.redis.del(CacheKeys.CURRENT_USER(id, schema));
      await this.redis.deleteByPattern(`auth:session:*`);
    }
  }

  // ── Role management ───────────────────────────────────────────────

  async assignRole(
    staffId: string,
    dto: AssignRoleDto,
    actor: IJwtPayload,
  ): Promise<void> {
    const schema = this.crmCtx.getSchema();
    await this.assertStaffExists(staffId, schema);
    await this.assertRoleExists(dto.roleId, schema);

    const repo = this.repoFactory.for(UserRoleEntity, schema);
    const existing = await repo.findOne({
      where: { userId: staffId, roleId: dto.roleId },
    });
    if (existing) {
      throw new ConflictException(
        'This role is already assigned to the staff member',
      );
    }

    await repo.save({
      userId: staffId,
      roleId: dto.roleId,
      assignedBy: actor.sub,
    });
    await this.permissionResolver.invalidateUserPermissions(staffId, schema);
  }

  async revokeRole(
    staffId: string,
    roleId: string,
    actor: IJwtPayload,
  ): Promise<void> {
    const schema = this.crmCtx.getSchema();
    this.assertNotSelf(staffId, actor, 'Cannot revoke your own roles');
    await this.assertStaffExists(staffId, schema);

    await this.repoFactory
      .for(UserRoleEntity, schema)
      .delete({ userId: staffId, roleId });

    await this.permissionResolver.invalidateUserPermissions(staffId, schema);
  }

  // ── Department management ────────────────────────────────────────

  async assignDepartment(
    staffId: string,
    dto: AssignDepartmentDto,
    actor: IJwtPayload,
  ): Promise<void> {
    const schema = this.crmCtx.getSchema();
    await this.assertStaffExists(staffId, schema);
    await this.assertDepartmentExists(dto.departmentId, schema);

    const deptRepo = this.repoFactory.for(UserDepartmentEntity, schema);
    const existing = await deptRepo.findOne({
      where: { userId: staffId, departmentId: dto.departmentId },
    });
    if (existing) {
      throw new ConflictException('Staff member is already in this department');
    }

    // If setting as primary, clear existing primary first
    if (dto.isPrimary) {
      await deptRepo.update(
        { userId: staffId, isPrimary: true },
        { isPrimary: false },
      );
    }

    await deptRepo.save({
      userId: staffId,
      departmentId: dto.departmentId,
      isPrimary: dto.isPrimary ?? false,
      assignedBy: actor.sub,
    });

    // Department membership affects RBAC — invalidate
    await this.redis.del(
      CacheKeys.DEPARTMENT_MEMBERS(dto.departmentId, schema),
    );
    await this.permissionResolver.invalidateUserPermissions(staffId, schema);
  }

  async removeDepartment(staffId: string, departmentId: string): Promise<void> {
    const schema = this.crmCtx.getSchema();
    await this.repoFactory
      .for(UserDepartmentEntity, schema)
      .delete({ userId: staffId, departmentId });

    await this.redis.del(CacheKeys.DEPARTMENT_MEMBERS(departmentId, schema));
    await this.permissionResolver.invalidateUserPermissions(staffId, schema);
  }

  // ── Designation ───────────────────────────────────────────────────

  async setDesignation(staffId: string, dto: SetDesignationDto): Promise<void> {
    const schema = this.crmCtx.getSchema();
    await this.assertStaffExists(staffId, schema);

    if (dto.designationId) {
      await this.assertDesignationExists(dto.designationId, schema);
    }

    await this.repoFactory
      .for(UserEntity, schema)
      .update(staffId, { designationId: dto.designationId });

    await this.permissionResolver.invalidateUserPermissions(staffId, schema);
    await this.redis.del(CacheKeys.CURRENT_USER(staffId, schema));
  }

  // ── Permission overrides ─────────────────────────────────────────

  async addPermissionOverride(
    staffId: string,
    dto: AddPermissionOverrideDto,
    actor: IJwtPayload,
  ): Promise<void> {
    const schema = this.crmCtx.getSchema();
    await this.assertStaffExists(staffId, schema);

    const permExists = await this.repoFactory
      .for(PermissionEntity, schema)
      .findOne({ where: { id: dto.permissionId } });
    if (!permExists) {
      throw new NotFoundException(`Permission "${dto.permissionId}" not found`);
    }

    const repo = this.repoFactory.for(UserPermissionOverrideEntity, schema);

    // Remove conflicting override of the opposite type if exists
    await repo.delete({ userId: staffId, permissionId: dto.permissionId });

    await repo.save({
      userId: staffId,
      permissionId: dto.permissionId,
      type: dto.type,
      reason: dto.reason ?? null,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      grantedBy: actor.sub,
    });

    await this.permissionResolver.invalidateUserPermissions(staffId, schema);
  }

  async removePermissionOverride(
    staffId: string,
    permissionId: string,
  ): Promise<void> {
    const schema = this.crmCtx.getSchema();
    await this.repoFactory
      .for(UserPermissionOverrideEntity, schema)
      .delete({ userId: staffId, permissionId });

    await this.permissionResolver.invalidateUserPermissions(staffId, schema);
  }

  async listPermissionOverrides(
    staffId: string,
  ): Promise<UserPermissionOverrideEntity[]> {
    const schema = this.crmCtx.getSchema();
    return this.tenantConn.runInTenantSchema(schema, (em) =>
      em.query(
        `SELECT upo.*, p.key AS permission_key, p.display_name AS permission_display_name
         FROM user_permission_overrides upo
         JOIN permissions p ON p.id = upo.permission_id
         WHERE upo.user_id = $1
         ORDER BY upo.granted_at DESC`,
        [staffId],
      ),
    );
  }

  // ── Private validation helpers ────────────────────────────────────

  private assertClinicStaffType(userType: UserType): void {
    if (!CLINIC_STAFF_TYPES.includes(userType)) {
      throw new BadRequestException(
        `"${userType}" is not a valid clinic staff type`,
      );
    }
  }

  private assertCanManageUserType(
    targetType: UserType,
    actor: IJwtPayload,
  ): void {
    if (
      targetType === UserType.CLINIC_OWNER &&
      actor.userType !== UserType.CLINIC_OWNER
    ) {
      throw new ForbiddenException(
        'Only a clinic owner can create another owner',
      );
    }
  }

  private assertNotSelf(id: string, actor: IJwtPayload, message: string): void {
    if (id === actor.sub) throw new ForbiddenException(message);
  }

  private async assertStaffExists(
    id: string,
    schema: string,
  ): Promise<UserEntity> {
    const user = await this.repoFactory
      .for(UserEntity, schema)
      .findOne({ where: { id } });
    if (!user) throw new NotFoundException(`Staff member "${id}" not found`);
    return user;
  }

  private async assertRoleExists(
    roleId: string,
    schema: string,
  ): Promise<void> {
    const role = await this.repoFactory
      .for(RoleEntity, schema)
      .findOne({ where: { id: roleId } });
    if (!role) throw new NotFoundException(`Role "${roleId}" not found`);
  }

  private async assertRolesExist(
    roleIds: string[],
    schema: string,
  ): Promise<void> {
    for (const id of roleIds) await this.assertRoleExists(id, schema);
  }

  private async assertDepartmentExists(
    deptId: string,
    schema: string,
  ): Promise<void> {
    const dept = await this.repoFactory
      .for(DepartmentEntity, schema)
      .findOne({ where: { id: deptId } });
    if (!dept) throw new NotFoundException(`Department "${deptId}" not found`);
  }

  private async assertDepartmentsExist(
    deptIds: string[],
    schema: string,
  ): Promise<void> {
    for (const id of deptIds) await this.assertDepartmentExists(id, schema);
  }

  private async assertDesignationExists(
    desigId: string,
    schema: string,
  ): Promise<void> {
    const desig = await this.repoFactory
      .for(DesignationEntity, schema)
      .findOne({ where: { id: desigId } });
    if (!desig)
      throw new NotFoundException(`Designation "${desigId}" not found`);
  }
}
