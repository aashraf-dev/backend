import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { DATA_SOURCE_PLATFORM } from 'src/shared/constants/data-source.constants';
import { buildSchemaName } from 'src/shared/constants/data-source.constants';
import { TenantConnectionService } from '../../../database/tenant-connection.service';
import {
  TenantEntity,
  TenantStatus,
  SubscriptionPlan,
} from '../../../database/entities/platform/tenant.entity';
import { UserEntity } from 'src/database/entities/tenant';
import { AppointmentEntity } from 'src/database/entities/tenant';
import { PetEntity } from 'src/database/entities/tenant';
import { MedicalRecordEntity } from 'src/database/entities/tenant';
import { UserType } from 'src/shared/enums/user-type.enum';
import { RedisService } from '../../../shared/redis/redis.service';
import { CacheKeys } from '../../../shared/constants/cache-keys.constant';
import {
  IPaginatedResponse,
  buildPaginatedResponse,
} from '../../../shared/dto/paginated-response.interface';
import { TenantProvisioningService } from '../../iam/provisioning/tenant-provisioning.service';

import {
  CreateTenantDto,
  TenantQueryDto,
  TenantSortBy,
  UpdateTenantDto,
  UpdateSubscriptionDto,
  RetryProvisioningDto,
} from './dto';

export interface ITenantStats {
  staffCount: number;
  petOwnerCount: number;
  petCount: number;
  appointmentCount: number;
  medicalRecordCount: number;
  lastUserLoginAt: Date | null;
}

/** Slugs reserved for platform subdomains — cannot be used as tenant slugs */
const RESERVED_SLUGS = new Set([
  'admin',
  'api',
  'app',
  'www',
  'mail',
  'smtp',
  'ftp',
  'dev',
  'staging',
  'support',
  'help',
  'status',
  'health',
  'docs',
  'blog',
  'media',
]);

/** Valid tenant status transitions */
const ALLOWED_TRANSITIONS: Record<TenantStatus, TenantStatus[]> = {
  [TenantStatus.PENDING]: [TenantStatus.ACTIVE, TenantStatus.TERMINATED],
  [TenantStatus.ACTIVE]: [TenantStatus.SUSPENDED, TenantStatus.TERMINATED],
  [TenantStatus.SUSPENDED]: [TenantStatus.ACTIVE, TenantStatus.TERMINATED],
  [TenantStatus.TERMINATED]: [],
};

@Injectable()
export class TenantsService {
  private readonly logger = new Logger(TenantsService.name);

  constructor(
    @InjectDataSource(DATA_SOURCE_PLATFORM)
    private readonly platformDs: DataSource,
    private readonly tenantConn: TenantConnectionService,
    private readonly provisioningService: TenantProvisioningService,
    private readonly redis: RedisService,
  ) {}

  // ── Create ───────────────────────────────────────────────────────

  async create(dto: CreateTenantDto): Promise<TenantEntity> {
    const slug = this.slugify(dto.slug ?? dto.name);

    this.assertSlugNotReserved(slug);
    await this.assertSlugUnique(slug);
    await this.assertContactEmailUnique(dto.contactEmail);

    const schemaName = buildSchemaName(slug);

    // Step 1: persist the record in PENDING state
    const tenant = this.platformDs.getRepository(TenantEntity).create({
      name: dto.name,
      slug,
      schemaName,
      status: TenantStatus.PENDING,
      contactEmail: dto.contactEmail,
      contactPhone: dto.contactPhone ?? null,
      address: dto.address ?? null,
      city: dto.city ?? null,
      country: dto.country ?? null,
      timezone: dto.timezone ?? 'UTC',
      locale: dto.locale ?? 'en-US',
      subscriptionPlan: dto.subscriptionPlan ?? SubscriptionPlan.TRIAL,
    });

    const saved = await this.platformDs
      .getRepository(TenantEntity)
      .save(tenant);

    // Step 2: provision schema — idempotent, safe to retry
    try {
      await this.provisioningService.provision({
        tenantId: saved.id,
        slug,
        ownerEmail: dto.owner.email,
        ownerPassword: dto.owner.password,
        ownerFirstName: dto.owner.firstName,
        ownerLastName: dto.owner.lastName,
      });

      await this.platformDs
        .getRepository(TenantEntity)
        .update(saved.id, { status: TenantStatus.ACTIVE });

      return { ...saved, status: TenantStatus.ACTIVE };
    } catch (error) {
      // Keep in PENDING for retry via retryProvisioning endpoint
      this.logger.error(
        `Schema provisioning failed for tenant ${saved.id} (${slug}): ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw new InternalServerErrorException(
        `Tenant record created (ID: ${saved.id}) but schema provisioning failed. ` +
          `Use POST /admin/tenants/${saved.id}/retry-provisioning to retry.`,
      );
    }
  }

  // ── Read ──────────────────────────────────────────────────────────

  async findAll(
    query: TenantQueryDto,
  ): Promise<IPaginatedResponse<TenantEntity>> {
    const qb = this.platformDs
      .getRepository(TenantEntity)
      .createQueryBuilder('t')
      .where('t.deleted_at IS NULL');

    // Filters
    if (query.search) {
      qb.andWhere(
        '(t.name ILIKE :search OR t.slug ILIKE :search OR t.contact_email ILIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    if (query.status) {
      qb.andWhere('t.status = :status', { status: query.status });
    }

    if (query.subscriptionPlan) {
      qb.andWhere('t.subscription_plan = :plan', {
        plan: query.subscriptionPlan,
      });
    }

    // Sorting — map DTO field names to column names
    const sortColumnMap: Record<TenantSortBy, string> = {
      [TenantSortBy.NAME]: 't.name',
      [TenantSortBy.CREATED_AT]: 't.created_at',
      [TenantSortBy.STATUS]: 't.status',
      [TenantSortBy.LAST_ACTIVE]: 't.last_active_at',
      [TenantSortBy.SUBSCRIPTION]: 't.subscription_plan',
    };

    const sortColumn = sortColumnMap[query.sortBy ?? TenantSortBy.CREATED_AT];
    qb.orderBy(sortColumn, query.sortOrder ?? 'DESC');

    qb.skip(query.skip).take(query.limit);

    const [items, total] = await qb.getManyAndCount();
    return buildPaginatedResponse(items, total, query.page, query.limit);
  }

  async findOne(id: string): Promise<TenantEntity> {
    const tenant = await this.platformDs
      .getRepository(TenantEntity)
      .findOne({ where: { id } });

    if (!tenant) {
      throw new NotFoundException(`Tenant with ID "${id}" not found`);
    }

    return tenant;
  }

  async getTenantStats(id: string): Promise<ITenantStats> {
    const tenant = await this.findOne(id);

    const stats: Array<{
      staff_count: string;
      pet_owner_count: string;
      pet_count: string;
      appointment_count: string;
      medical_record_count: string;
      last_user_login: Date | null;
    }> = await this.tenantConn.runInTenantSchema(tenant.schemaName, (em) =>
      em.query(`
        SELECT
          (SELECT COUNT(*) FROM users
           WHERE user_type != 'pet_owner' AND deleted_at IS NULL
          )::int                                               AS staff_count,
          (SELECT COUNT(*) FROM users
           WHERE user_type = 'pet_owner' AND deleted_at IS NULL
          )::int                                               AS pet_owner_count,
          (SELECT COUNT(*) FROM pets WHERE deleted_at IS NULL
          )::int                                               AS pet_count,
          (SELECT COUNT(*) FROM appointments WHERE deleted_at IS NULL
          )::int                                               AS appointment_count,
          (SELECT COUNT(*) FROM medical_records WHERE deleted_at IS NULL
          )::int                                               AS medical_record_count,
          (SELECT MAX(last_login_at) FROM users)               AS last_user_login
      `),
    );

    const row = stats[0];
    return {
      staffCount: parseInt(row.staff_count, 10),
      petOwnerCount: parseInt(row.pet_owner_count, 10),
      petCount: parseInt(row.pet_count, 10),
      appointmentCount: parseInt(row.appointment_count, 10),
      medicalRecordCount: parseInt(row.medical_record_count, 10),
      lastUserLoginAt: row.last_user_login,
    };
  }

  // ── Update ────────────────────────────────────────────────────────

  async update(id: string, dto: UpdateTenantDto): Promise<TenantEntity> {
    const tenant = await this.findOne(id);

    if (dto.contactEmail && dto.contactEmail !== tenant.contactEmail) {
      await this.assertContactEmailUnique(dto.contactEmail, id);
    }

    await this.platformDs.getRepository(TenantEntity).update(id, {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.contactEmail !== undefined && { contactEmail: dto.contactEmail }),
      ...(dto.contactPhone !== undefined && { contactPhone: dto.contactPhone }),
      ...(dto.address !== undefined && { address: dto.address }),
      ...(dto.city !== undefined && { city: dto.city }),
      ...(dto.country !== undefined && { country: dto.country }),
      ...(dto.timezone !== undefined && { timezone: dto.timezone }),
      ...(dto.locale !== undefined && { locale: dto.locale }),
    });

    await this.invalidateTenantCache(tenant.slug, id);

    return this.findOne(id);
  }

  async updateSubscription(
    id: string,
    dto: UpdateSubscriptionDto,
  ): Promise<TenantEntity> {
    await this.findOne(id);

    await this.platformDs.getRepository(TenantEntity).update(id, {
      subscriptionPlan: dto.plan,
      subscriptionExpiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
    });

    return this.findOne(id);
  }

  // ── Status transitions ─────────────────────────────────────────

  async activate(id: string): Promise<TenantEntity> {
    return this.transitionStatus(id, TenantStatus.ACTIVE);
  }

  async suspend(id: string): Promise<TenantEntity> {
    const tenant = await this.transitionStatus(id, TenantStatus.SUSPENDED);

    // Immediate effect: remove from middleware cache so next request
    // gets the SUSPENDED status from DB and returns 503
    await this.invalidateTenantCache(tenant.slug, id);

    return tenant;
  }

  async terminate(id: string): Promise<TenantEntity> {
    const tenant = await this.transitionStatus(id, TenantStatus.TERMINATED);
    await this.invalidateTenantCache(tenant.slug, id);
    return tenant;
  }

  async retryProvisioning(
    id: string,
    dto: RetryProvisioningDto,
  ): Promise<TenantEntity> {
    const tenant = await this.findOne(id);

    if (tenant.status !== TenantStatus.PENDING) {
      throw new UnprocessableEntityException(
        `Retry provisioning is only available for tenants in PENDING status. Current status: ${tenant.status}`,
      );
    }

    const ownerEmail = dto.owner?.email;
    const ownerPassword = dto.owner?.password;
    const ownerFirstName = dto.owner?.firstName;
    const ownerLastName = dto.owner?.lastName;

    if (!ownerEmail || !ownerPassword || !ownerFirstName || !ownerLastName) {
      throw new UnprocessableEntityException(
        'Owner information is required for retry provisioning.',
      );
    }

    try {
      await this.provisioningService.provision({
        tenantId: tenant.id,
        slug: tenant.slug,
        ownerEmail,
        ownerPassword,
        ownerFirstName,
        ownerLastName,
      });

      await this.platformDs
        .getRepository(TenantEntity)
        .update(id, { status: TenantStatus.ACTIVE });

      this.logger.log(`Tenant ${id} provisioned successfully on retry`);
      return this.findOne(id);
    } catch (error) {
      this.logger.error(
        `Retry provisioning failed for tenant ${id}: ${(error as Error).message}`,
      );
      throw new InternalServerErrorException(
        `Provisioning retry failed: ${(error as Error).message}`,
      );
    }
  }

  // ── Private helpers ───────────────────────────────────────────────

  private async transitionStatus(
    id: string,
    targetStatus: TenantStatus,
  ): Promise<TenantEntity> {
    const tenant = await this.findOne(id);
    const allowed = ALLOWED_TRANSITIONS[tenant.status] ?? [];

    if (!allowed.includes(targetStatus)) {
      throw new UnprocessableEntityException(
        `Cannot transition tenant from "${tenant.status}" to "${targetStatus}". ` +
          `Allowed transitions: [${allowed.join(', ') || 'none'}]`,
      );
    }

    await this.platformDs
      .getRepository(TenantEntity)
      .update(id, { status: targetStatus });

    return { ...tenant, status: targetStatus };
  }

  private async invalidateTenantCache(slug: string, id: string): Promise<void> {
    await this.redis.del(
      CacheKeys.TENANT_BY_SLUG(slug),
      CacheKeys.TENANT_BY_ID(id),
    );
  }

  private slugify(input: string): string {
    return input
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // remove diacritics
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 100);
  }

  private assertSlugNotReserved(slug: string): void {
    if (RESERVED_SLUGS.has(slug)) {
      throw new ConflictException(
        `"${slug}" is a reserved slug and cannot be used as a clinic identifier`,
      );
    }
  }

  private async assertSlugUnique(
    slug: string,
    excludeId?: string,
  ): Promise<void> {
    const qb = this.platformDs
      .getRepository(TenantEntity)
      .createQueryBuilder('t')
      .where('t.slug = :slug AND t.deleted_at IS NULL', { slug });

    if (excludeId) {
      qb.andWhere('t.id != :excludeId', { excludeId });
    }

    const existing = await qb.getOne();
    if (existing) {
      throw new ConflictException(
        `A clinic with slug "${slug}" already exists`,
      );
    }
  }

  private async assertContactEmailUnique(
    email: string,
    excludeId?: string,
  ): Promise<void> {
    const qb = this.platformDs
      .getRepository(TenantEntity)
      .createQueryBuilder('t')
      .where('t.contact_email = :email AND t.deleted_at IS NULL', { email });

    if (excludeId) {
      qb.andWhere('t.id != :excludeId', { excludeId });
    }

    const existing = await qb.getOne();
    if (existing) {
      throw new ConflictException(
        `Contact email "${email}" is already registered to another clinic`,
      );
    }
  }
}
