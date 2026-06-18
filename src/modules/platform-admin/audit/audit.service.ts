import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { DATA_SOURCE_PLATFORM } from 'src/shared/constants/data-source.constants';
import { PlatformAuditLogEntity } from 'src/database/entities/platform';
import {
  IPaginatedResponse,
  buildPaginatedResponse,
} from '../../../shared/dto/paginated-response.interface';

import { AuditQueryDto } from './dto';

@Injectable()
export class AuditService {
  constructor(
    @InjectDataSource(DATA_SOURCE_PLATFORM)
    private readonly platformDs: DataSource,
  ) {}

  async findAll(
    query: AuditQueryDto,
  ): Promise<IPaginatedResponse<PlatformAuditLogEntity>> {
    const qb = this.platformDs
      .getRepository(PlatformAuditLogEntity)
      .createQueryBuilder('log')
      .leftJoin('log.actor', 'actor')
      .addSelect([
        'actor.id',
        'actor.email',
        'actor.firstName',
        'actor.lastName',
      ])
      .leftJoin('log.tenant', 'tenant')
      .addSelect(['tenant.id', 'tenant.name', 'tenant.slug'])
      .orderBy(`log.created_at`, query.sortOrder ?? 'DESC');

    // ── Dynamic filters ──────────────────────────────────────────

    if (query.actorId) {
      qb.andWhere('log.actor_id = :actorId', { actorId: query.actorId });
    }

    if (query.tenantId) {
      qb.andWhere('log.tenant_id = :tenantId', { tenantId: query.tenantId });
    }

    if (query.appContext) {
      qb.andWhere('log.app_context = :appContext', {
        appContext: query.appContext,
      });
    }

    if (query.action) {
      qb.andWhere('log.action ILIKE :action', { action: `%${query.action}%` });
    }

    if (query.resourceType) {
      qb.andWhere('log.resource_type = :resourceType', {
        resourceType: query.resourceType,
      });
    }

    if (query.startDate) {
      qb.andWhere('log.created_at >= :startDate', {
        startDate: new Date(query.startDate),
      });
    }

    if (query.endDate) {
      qb.andWhere('log.created_at <= :endDate', {
        endDate: new Date(query.endDate),
      });
    }

    qb.skip(query.skip).take(query.limit);

    const [items, total] = await qb.getManyAndCount();
    return buildPaginatedResponse(items, total, query.page, query.limit);
  }
}
