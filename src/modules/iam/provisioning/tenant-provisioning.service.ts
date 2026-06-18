import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';

import { DATA_SOURCE_PLATFORM } from 'src/shared/constants/data-source.constants';
import { buildSchemaName } from 'src/shared/constants/data-source.constants';
import { TenantConnectionService } from '../../../database/tenant-connection.service';
import { TenantEntity } from '../../../database/entities/platform/tenant.entity';

import { UserEntity } from '../../../database/entities/tenant/user.entity';
import { RoleEntity } from '../../../database/entities/tenant/role.entity';
import { PermissionEntity } from '../../../database/entities/tenant/permission.entity';
import { RolePermissionEntity } from '../../../database/entities/tenant/role-permission.entity';
import { UserRoleEntity } from '../../../database/entities/tenant/user-role.entity';

import { UserType } from '../../../shared/enums/user-type.enum';
import {
  PERMISSION_SEEDS,
  DEFAULT_ROLE_PERMISSION_KEYS,
} from '../../../shared/constants/permission-seeds.constant';

export interface IProvisionTenantParams {
  tenantId: string;
  slug: string;
  ownerEmail: string;
  ownerPassword: string;
  ownerFirstName: string;
  ownerLastName: string;
}

export interface IProvisionResult {
  schemaName: string;
  ownerUserId: string;
}

/** System roles seeded into every new tenant schema */
const SYSTEM_ROLES: Array<{
  name: string;
  displayName: string;
  description: string;
}> = [
  {
    name: 'clinic_owner',
    displayName: 'Clinic Owner',
    description: 'Full clinic administration access',
  },
  {
    name: 'clinic_manager',
    displayName: 'Clinic Manager',
    description: 'Manage staff, schedule, and reports',
  },
  {
    name: 'veterinarian',
    displayName: 'Veterinarian',
    description: 'Clinical staff — full patient access',
  },
  {
    name: 'vet_intern',
    displayName: 'Vet Intern',
    description: 'Supervised clinical staff — read-only patient access',
  },
  {
    name: 'receptionist',
    displayName: 'Receptionist',
    description: 'Front-desk staff — appointments and basic patient info',
  },
  {
    name: 'billing_staff',
    displayName: 'Billing Staff',
    description: 'Billing and financial reports access',
  },
  {
    name: 'pet_owner',
    displayName: 'Pet Owner',
    description: 'Client portal access — own pets only',
  },
];

@Injectable()
export class TenantProvisioningService {
  private readonly logger = new Logger(TenantProvisioningService.name);
  private readonly bcryptRounds: number;

  constructor(
    private readonly tenantConn: TenantConnectionService,
    private readonly configService: ConfigService,
    @InjectDataSource(DATA_SOURCE_PLATFORM)
    private readonly platformDs: DataSource,
  ) {
    this.bcryptRounds = this.configService.get<number>('auth.bcryptRounds')!;
  }

  async provision(params: IProvisionTenantParams): Promise<IProvisionResult> {
    const schemaName = buildSchemaName(params.slug);

    this.logger.log(`Provisioning tenant schema: ${schemaName}`);

    // 1. Create and synchronise schema tables
    await this.tenantConn.provisionTenantSchema(schemaName);

    // 2. Seed all data in a single transaction
    const ownerUserId = await this.tenantConn.runInTenantSchema(
      schemaName,
      async (em) => {
        // 2a. Seed permissions
        const permissionMap = await this.seedPermissions(em);

        // 2b. Seed system roles
        const roleMap = await this.seedRoles(em);

        // 2c. Assign permissions to roles
        await this.assignRolePermissions(em, roleMap, permissionMap);

        // 2d. Create the initial clinic owner user
        const ownerId = await this.createOwnerUser(em, params);

        // 2e. Assign clinic_owner role
        await this.assignRoleToUser(em, ownerId, roleMap.get('clinic_owner')!);

        return ownerId;
      },
    );

    // 3. Mark schema as provisioned
    await this.platformDs
      .getRepository(TenantEntity)
      .update(params.tenantId, { schemaProvisionedAt: new Date() });

    this.logger.log(
      `Tenant ${params.slug} provisioned — schema: ${schemaName}, owner: ${ownerUserId}`,
    );

    return { schemaName, ownerUserId };
  }

  // ── Private: seeding ─────────────────────────────────────────────

  private async seedPermissions(
    em: Parameters<
      Parameters<TenantConnectionService['runInTenantSchema']>[1]
    >[0],
  ): Promise<Map<string, string>> {
    const permissionMap = new Map<string, string>(); // key → id

    for (const seed of PERMISSION_SEEDS) {
      const existing = await em.findOne(PermissionEntity, {
        where: { key: seed.key },
      });

      if (existing) {
        permissionMap.set(seed.key, existing.id);
        continue;
      }

      const perm = em.create(PermissionEntity, {
        key: seed.key,
        module: seed.module,
        action: seed.action,
        context: seed.context,
        displayName: seed.displayName,
        description: seed.description,
        isSystem: true,
      });

      const saved = await em.save(PermissionEntity, perm);
      permissionMap.set(seed.key, saved.id);
    }

    this.logger.debug(`Seeded ${PERMISSION_SEEDS.length} permissions`);
    return permissionMap;
  }

  private async seedRoles(
    em: Parameters<
      Parameters<TenantConnectionService['runInTenantSchema']>[1]
    >[0],
  ): Promise<Map<string, string>> {
    const roleMap = new Map<string, string>(); // name → id

    for (const roleDef of SYSTEM_ROLES) {
      const existing = await em.findOne(RoleEntity, {
        where: { name: roleDef.name },
      });

      if (existing) {
        roleMap.set(roleDef.name, existing.id);
        continue;
      }

      const role = em.create(RoleEntity, {
        name: roleDef.name,
        displayName: roleDef.displayName,
        description: roleDef.description,
        isSystem: true,
        isActive: true,
      });

      const saved = await em.save(RoleEntity, role);
      roleMap.set(roleDef.name, saved.id);
    }

    this.logger.debug(`Seeded ${SYSTEM_ROLES.length} system roles`);
    return roleMap;
  }

  private async assignRolePermissions(
    em: Parameters<
      Parameters<TenantConnectionService['runInTenantSchema']>[1]
    >[0],
    roleMap: Map<string, string>,
    permissionMap: Map<string, string>,
  ): Promise<void> {
    const assignments: Array<{ roleId: string; permissionId: string }> = [];

    for (const [roleName, permissionKeys] of Object.entries(
      DEFAULT_ROLE_PERMISSION_KEYS,
    )) {
      const roleId = roleMap.get(roleName);
      if (!roleId) continue;

      for (const key of permissionKeys) {
        const permissionId = permissionMap.get(key);
        if (!permissionId) continue;

        const existing = await em.findOne(RolePermissionEntity, {
          where: { roleId, permissionId },
        });

        if (!existing) {
          assignments.push({ roleId, permissionId });
        }
      }
    }

    if (assignments.length > 0) {
      const entities = assignments.map(({ roleId, permissionId }) =>
        em.create(RolePermissionEntity, { roleId, permissionId }),
      );
      await em.save(RolePermissionEntity, entities);
    }

    this.logger.debug(`Assigned ${assignments.length} role-permission pairs`);
  }

  private async createOwnerUser(
    em: Parameters<
      Parameters<TenantConnectionService['runInTenantSchema']>[1]
    >[0],
    params: IProvisionTenantParams,
  ): Promise<string> {
    // Idempotent — if the owner was already created in a previous partial attempt, skip
    const existing = await em.findOne(UserEntity, {
      where: { email: params.ownerEmail.toLowerCase().trim() },
    });

    if (existing) {
      this.logger.debug(
        `Owner user already exists (${existing.id}), skipping creation`,
      );
      return existing.id;
    }

    if (
      !params.ownerPassword ||
      !params.ownerFirstName ||
      !params.ownerLastName
    ) {
      throw new Error(
        'Owner credentials required but not provided and owner user does not exist',
      );
    }

    const passwordHash = await bcrypt.hash(
      params.ownerPassword,
      this.bcryptRounds,
    );

    const user = em.create(UserEntity, {
      email: params.ownerEmail.toLowerCase().trim(),
      passwordHash,
      firstName: params.ownerFirstName,
      lastName: params.ownerLastName,
      userType: UserType.CLINIC_OWNER,
      isActive: true,
      isEmailVerified: true,
    });

    const saved = await em.save(UserEntity, user);
    this.logger.debug(`Owner user created: ${saved.id}`);
    return saved.id;
  }

  private async assignRoleToUser(
    em: Parameters<
      Parameters<TenantConnectionService['runInTenantSchema']>[1]
    >[0],
    userId: string,
    roleId: string,
  ): Promise<void> {
    const userRole = em.create(UserRoleEntity, {
      userId,
      roleId,
      assignedBy: null,
    });
    await em.save(UserRoleEntity, userRole);
  }
}
