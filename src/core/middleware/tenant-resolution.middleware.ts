import {
  Injectable,
  NestMiddleware,
  NotFoundException,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ClsService } from 'nestjs-cls';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { AppContext } from '../../shared/enums/app-context.enum';
import { IClsStore } from '../context/request-context';
import { DATA_SOURCE_PLATFORM } from 'src/shared/constants/data-source.constants';
import {
  TenantEntity,
  TenantStatus,
} from '../../database/entities/platform/tenant.entity';
import { RedisService } from '../../shared/redis/redis.service';
import { CacheKeys, CacheTTL } from 'src/shared/constants';
import { ConfigService } from '@nestjs/config';

interface IResolvedSubdomain {
  tenantSlug: string | null;
  appContext: AppContext;
}

@Injectable()
export class TenantResolutionMiddleware implements NestMiddleware {
  private readonly logger = new Logger(TenantResolutionMiddleware.name);
  private readonly baseDomain: string;

  /** Pattern: {slug}-{context}.domain or admin.domain or domain */
  private readonly SUBDOMAIN_PATTERN: RegExp;

  constructor(
    private readonly cls: ClsService<IClsStore>,
    private readonly redis: RedisService,
    private readonly configService: ConfigService,
    @InjectDataSource(DATA_SOURCE_PLATFORM)
    private readonly platformDs: DataSource,
  ) {
    this.baseDomain = this.configService.get<string>('app.baseDomain')!;
    // Escape dots in domain for regex
    const escapedDomain = this.baseDomain.replace(/\./g, '\\.');
    this.SUBDOMAIN_PATTERN = new RegExp(
      `^(?:([a-z0-9]+(?:[_-][a-z0-9]+)*)-(crm|portal|website)\\.${escapedDomain}|admin\\.${escapedDomain}|(?:www\\.)?${escapedDomain})(?::\\d+)?$`,
      'i',
    );
  }

  async use(req: Request, _res: Response, next: NextFunction): Promise<void> {
    const host = req.hostname ?? req.headers.host ?? '';

    const resolved = this.parseSubdomain(host);

    // Set base context values
    this.cls.set('APP_CONTEXT', resolved.appContext);
    this.cls.set('TENANT_SLUG', resolved.tenantSlug);

    if (!resolved.tenantSlug) {
      // admin.vetos.com or vetos.com — no tenant context needed
      this.cls.set('TENANT_ID', null);
      this.cls.set('TENANT_SCHEMA', null);
      return next();
    }

    // Resolve tenant from slug (Redis → DB)
    const tenant = await this.resolveTenant(resolved.tenantSlug);

    if (!tenant) {
      throw new NotFoundException(`Clinic "${resolved.tenantSlug}" not found`);
    }

    if (tenant.status !== TenantStatus.ACTIVE) {
      throw new ServiceUnavailableException(
        `Clinic account is ${tenant.status}. Please contact support.`,
      );
    }

    this.cls.set('TENANT_ID', tenant.id);
    this.cls.set('TENANT_SCHEMA', tenant.schemaName);

    next();
  }

  // ── Private ────────────────────────────────────────────────────────

  private parseSubdomain(host: string): IResolvedSubdomain {
    const match = this.SUBDOMAIN_PATTERN.exec(host.toLowerCase());

    if (!match) {
      // Fallback for local dev (localhost:3000) — treat as admin
      if (host.startsWith('localhost') || host.startsWith('127.0.0.1')) {
        return { tenantSlug: null, appContext: AppContext.ADMIN };
      }
      this.logger.warn(`Unrecognised host: "${host}" — defaulting to WEBSITE`);
      return { tenantSlug: null, appContext: AppContext.WEBSITE };
    }

    const [, slugCapture, contextCapture] = match;

    // admin.vetos.com — both captures are undefined
    if (!slugCapture && !contextCapture) {
      return { tenantSlug: null, appContext: AppContext.ADMIN };
    }

    // vetos.com — both captures are undefined (corporate site)
    if (!slugCapture) {
      return { tenantSlug: null, appContext: AppContext.WEBSITE };
    }

    const appContext =
      (contextCapture?.toLowerCase() as AppContext) ?? AppContext.WEBSITE;
    return { tenantSlug: slugCapture.toLowerCase(), appContext };
  }

  private async resolveTenant(slug: string): Promise<TenantEntity | null> {
    // 1. Check Redis cache
    const cacheKey = CacheKeys.TENANT_BY_SLUG(slug);
    const cached = await this.redis.getJson<TenantEntity>(cacheKey);
    if (cached) return cached;

    // 2. Hit the DB
    const repo = this.platformDs.getRepository(TenantEntity);
    const tenant = await repo.findOne({ where: { slug } });

    if (tenant) {
      await this.redis.setJson(cacheKey, tenant, CacheTTL.TENANT);
    }

    return tenant;
  }
}
