import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { DATA_SOURCE_PLATFORM } from 'src/shared/constants/data-source.constants';
import { TenantConnectionService } from '../../../database/tenant-connection.service';
import { TenantRepositoryFactory } from '../../../database/tenant-repository';
import { TenantEntity } from '../../../database/entities/platform/tenant.entity';
import { UserEntity } from '../../../database/entities/tenant/user.entity';
import { ClinicServiceEntity } from '../../../database/entities/tenant/clinic-service.entity';
import { UserType } from '../../../shared/enums/user-type.enum';
import { RedisService } from '../../../shared/redis/redis.service';
import { CacheKeys } from '../../../shared/constants/cache-keys.constant';
import { CacheTTL } from '../../../shared/constants/cache-ttl.constant';
import { PortalContextService } from '../common/portal-context.service';

export interface IClinicPublicInfo {
  name: string;
  city: string | null;
  country: string | null;
  contactEmail: string;
  contactPhone: string | null;
  timezone: string;
  locale: string;
}

export interface IPublicVet {
  id: string;
  firstName: string;
  lastName: string;
  userType: UserType;
  designation: string | null;
}

@Injectable()
export class ClinicInfoService {
  constructor(
    private readonly portalCtx: PortalContextService,
    private readonly repoFactory: TenantRepositoryFactory,
    private readonly tenantConn: TenantConnectionService,
    private readonly redis: RedisService,
    @InjectDataSource(DATA_SOURCE_PLATFORM)
    private readonly platformDs: DataSource,
  ) {}

  // ── Clinic public info ────────────────────────────────────────────

  async getClinicInfo(): Promise<IClinicPublicInfo> {
    const tenantId = this.portalCtx.getTenantId();
    const cacheKey = CacheKeys.TENANT_BY_ID(tenantId);

    const cached = await this.redis.getJson<TenantEntity>(cacheKey);
    const tenant =
      cached ??
      (await this.platformDs
        .getRepository(TenantEntity)
        .findOne({ where: { id: tenantId } }));

    if (!tenant) throw new NotFoundException('Clinic not found');

    if (!cached) {
      await this.redis.setJson(cacheKey, tenant, CacheTTL.TENANT);
    }

    return {
      name: tenant.name,
      city: tenant.city,
      country: tenant.country,
      contactEmail: tenant.contactEmail,
      contactPhone: tenant.contactPhone,
      timezone: tenant.timezone,
      locale: tenant.locale,
    };
  }

  // ── Available vets ────────────────────────────────────────────────

  async getAvailableVets(): Promise<IPublicVet[]> {
    const schema = this.portalCtx.getSchema();

    const rows: any[] = await this.tenantConn.runInTenantSchema(schema, (em) =>
      em.query(`
        SELECT
          u.id,
          u.first_name,
          u.last_name,
          u.user_type,
          d.name AS designation_name
        FROM users u
        LEFT JOIN designations d ON d.id = u.designation_id
        WHERE u.user_type IN ('veterinarian', 'clinic_owner')
          AND u.is_active = TRUE
          AND u.deleted_at IS NULL
        ORDER BY u.first_name
      `),
    );

    return rows.map((r) => ({
      id: r.id,
      firstName: r.first_name,
      lastName: r.last_name,
      userType: r.user_type,
      designation: r.designation_name ?? null,
    }));
  }

  // ── Available services ────────────────────────────────────────────

  async getAvailableServices(): Promise<ClinicServiceEntity[]> {
    const schema = this.portalCtx.getSchema();
    return this.repoFactory.for(ClinicServiceEntity, schema).find({
      where: { isActive: true },
      order: { category: 'ASC', name: 'ASC' },
    });
  }
}
