import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { TenantConnectionService } from '../../../database/tenant-connection.service';
import { TenantRepositoryFactory } from '../../../database/tenant-repository';
import { RoleEntity } from '../../../database/entities/tenant/role.entity';
import { PermissionEntity } from '../../../database/entities/tenant/permission.entity';
import { RolePermissionEntity } from '../../../database/entities/tenant/role-permission.entity';
import { UserRoleEntity } from '../../../database/entities/tenant/user-role.entity';
import { CrmContextService } from '../common/crm-context.service';
import { PermissionResolverService } from 'src/core/servicese/permission-resolver.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { AssignPermissionsDto } from './dto/assign-permissions.dto';

export interface IRoleWithPermissions extends RoleEntity {
  permissions: Array<{
    id: string;
    key: string;
    displayName: string;
    module: string;
  }>;
}

@Injectable()
export class RolesService {
  constructor(
    private readonly crmCtx: CrmContextService,
    private readonly repoFactory: TenantRepositoryFactory,
    private readonly tenantConn: TenantConnectionService,
    private readonly permissionResolver: PermissionResolverService,
  ) {}

  // ── Roles CRUD ────────────────────────────────────────────────

  async findAll(): Promise<IRoleWithPermissions[]> {
    const schema = this.crmCtx.getSchema();

    return this.tenantConn.runInTenantSchema(schema, async (em) => {
      const rows: any[] = await em.query(`
        SELECT
          r.id, r.name, r.display_name, r.description,
          r.is_system, r.is_active, r.created_at,
          p.id   AS perm_id,
          p.key  AS perm_key,
          p.display_name AS perm_display_name,
          p.module       AS perm_module
        FROM roles r
        LEFT JOIN role_permissions rp ON rp.role_id = r.id
        LEFT JOIN permissions p ON p.id = rp.permission_id
        WHERE r.deleted_at IS NULL
        ORDER BY r.is_system DESC, r.name ASC, p.module, p.key
      `);

      // Aggregate permissions per role
      const roleMap = new Map<string, IRoleWithPermissions>();

      for (const row of rows) {
        if (!roleMap.has(row.id)) {
          roleMap.set(row.id, {
            id: row.id,
            name: row.name,
            displayName: row.display_name,
            description: row.description,
            isSystem: row.is_system,
            isActive: row.is_active,
            createdAt: row.created_at,
            permissions: [],
          } as any);
        }

        if (row.perm_id) {
          roleMap.get(row.id)!.permissions.push({
            id: row.perm_id,
            key: row.perm_key,
            displayName: row.perm_display_name,
            module: row.perm_module,
          });
        }
      }

      return Array.from(roleMap.values());
    });
  }

  async findOne(id: string): Promise<IRoleWithPermissions> {
    const roles = await this.findAll();
    const role = roles.find((r) => r.id === id);
    if (!role) throw new NotFoundException(`Role "${id}" not found`);
    return role;
  }

  async create(dto: CreateRoleDto): Promise<IRoleWithPermissions> {
    const schema = this.crmCtx.getSchema();
    const roleRepo = this.repoFactory.for(RoleEntity, schema);

    const existing = await roleRepo.findOne({ where: { name: dto.name } });
    if (existing)
      throw new ConflictException(`Role "${dto.name}" already exists`);

    const saved = await roleRepo.save({
      name: dto.name,
      displayName: dto.displayName,
      description: dto.description ?? null,
      isSystem: false,
      isActive: true,
    });

    if (dto.permissionIds?.length) {
      await this.assignPermissions(saved.id, {
        permissionIds: dto.permissionIds,
      });
    }

    return this.findOne(saved.id);
  }

  async update(id: string, dto: UpdateRoleDto): Promise<IRoleWithPermissions> {
    const schema = this.crmCtx.getSchema();
    const role = await this.findOne(id);

    if (role.isSystem && (dto.name || dto.isActive === false)) {
      throw new ForbiddenException(
        'System roles cannot have their name changed or be deactivated',
      );
    }

    await this.repoFactory.for(RoleEntity, schema).update(id, {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.displayName !== undefined && { displayName: dto.displayName }),
      ...(dto.description !== undefined && { description: dto.description }),
    });

    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const schema = this.crmCtx.getSchema();
    const role = await this.findOne(id);

    if (role.isSystem) {
      throw new ForbiddenException('System roles cannot be deleted');
    }

    const userCount = await this.repoFactory
      .for(UserRoleEntity, schema)
      .count({ where: { roleId: id } });

    if (userCount > 0) {
      throw new ConflictException(
        `Cannot delete role assigned to ${userCount} staff member(s)`,
      );
    }

    await this.repoFactory.for(RoleEntity, schema).softDelete(id);
    await this.permissionResolver.invalidateRolePermissions(id, schema);
  }

  // ── Permission assignment ─────────────────────────────────────

  async assignPermissions(
    roleId: string,
    dto: AssignPermissionsDto,
  ): Promise<void> {
    const schema = this.crmCtx.getSchema();
    await this.findOne(roleId);

    await this.tenantConn.runInTenantSchema(schema, async (em) => {
      for (const permissionId of dto.permissionIds) {
        const permExists = await em.findOne(PermissionEntity, {
          where: { id: permissionId },
        });
        if (!permExists) {
          throw new NotFoundException(`Permission "${permissionId}" not found`);
        }

        const exists = await em.findOne(RolePermissionEntity, {
          where: { roleId, permissionId },
        });

        if (!exists) {
          await em.save(RolePermissionEntity, { roleId, permissionId });
        }
      }
    });

    await this.permissionResolver.invalidateRolePermissions(roleId, schema);
  }

  async revokePermissions(
    roleId: string,
    dto: AssignPermissionsDto,
  ): Promise<void> {
    const schema = this.crmCtx.getSchema();
    const role = await this.findOne(roleId);

    for (const permissionId of dto.permissionIds) {
      await this.repoFactory
        .for(RolePermissionEntity, schema)
        .delete({ roleId, permissionId });
    }

    await this.permissionResolver.invalidateRolePermissions(roleId, schema);
  }

  // ── Permissions catalog ───────────────────────────────────────

  async listAllPermissions(): Promise<PermissionEntity[]> {
    return this.repoFactory
      .for(PermissionEntity, this.crmCtx.getSchema())
      .find({ order: { module: 'ASC', action: 'ASC' } });
  }
}
