import { Injectable, Logger, PaymentRequiredException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { format, startOfMonth } from 'date-fns';

import { DATA_SOURCE_PLATFORM } from 'src/shared/constants/data-source.constants';
import { AiQuotaEntity } from '../entities/platform/ai-quota.entity';
import { AiUsageLogEntity } from '../entities/platform/ai-usage-log.entity';
import {
  TenantEntity,
  SubscriptionPlan,
} from '../../../database/entities/platform/tenant.entity';
import { RedisService } from '../../../shared/redis/redis.service';
import { IAiResponse } from './ai-provider.service';

// Approximate cost in USD per 1K tokens
const COST_INPUT = 0.005;
const COST_OUTPUT = 0.015;

const PLAN_LIMITS: Record<SubscriptionPlan, number> = {
  trial: 10,
  starter: 15,
  professional: 20,
  enterprise: 50,
};

@Injectable()
export class AiCostGuardService {
  private readonly logger = new Logger(AiCostGuardService.name);

  constructor(
    @InjectDataSource(DATA_SOURCE_PLATFORM)
    private readonly platformDs: DataSource,
    private readonly redis: RedisService,
    private readonly configService: ConfigService,
  ) {}

  // ── Pre-flight check ──────────────────────────────────────────────────

  async assertQuotaAvailable(tenantId: string): Promise<void> {
    const key = `ai:quota:exceeded:${tenantId}`;
    const cached = await this.redis.get(key);
    if (cached === '1') {
      throw new PaymentRequiredException(
        'Monthly AI quota exceeded. Please upgrade your plan or wait until next month.',
      );
    }

    const quota = await this.getOrCreateQuota(tenantId);
    if (quota.isExceeded) {
      await this.redis.set(key, '1', 3600); // cache for 1 hour
      throw new PaymentRequiredException(
        'Monthly AI quota exceeded. Please upgrade your plan or wait until next month.',
      );
    }
  }

  // ── Record usage after a successful AI call ───────────────────────────

  async recordUsage(
    tenantId: string,
    userId: string | null,
    feature: string,
    response: IAiResponse,
    cacheHit = false,
  ): Promise<void> {
    const costUsd = this.calculateCost(
      response.promptTokens,
      response.completionTokens,
    );

    // Write usage log
    await this.platformDs.getRepository(AiUsageLogEntity).save({
      tenantId,
      userId,
      feature,
      model: 'gpt-4o',
      promptTokens: response.promptTokens,
      completionTokens: response.completionTokens,
      totalTokens: response.totalTokens,
      costUsd,
      durationMs: response.durationMs,
      cacheHit,
    });

    if (cacheHit) return; // Don't count cached responses toward quota

    // Increment quota consumption atomically
    await this.platformDs.query(
      `UPDATE public.ai_quotas
       SET consumed_usd = consumed_usd + $1,
           is_exceeded  = (consumed_usd + $1) >= monthly_limit_usd,
           updated_at   = NOW()
       WHERE tenant_id = $2 AND period_start = $3`,
      [costUsd, tenantId, format(startOfMonth(new Date()), 'yyyy-MM-dd')],
    );

    // Bust cache if newly exceeded
    const updated = await this.getOrCreateQuota(tenantId);
    if (updated.isExceeded) {
      await this.redis.set(`ai:quota:exceeded:${tenantId}`, '1', 3600);
      this.logger.warn(
        `Tenant ${tenantId} has exceeded AI quota for this month`,
      );
    }
  }

  // ── Monthly summary ───────────────────────────────────────────────────

  async getMonthlyUsage(tenantId: string): Promise<{
    consumed: number;
    limit: number;
    percentage: number;
    isExceeded: boolean;
  }> {
    const quota = await this.getOrCreateQuota(tenantId);
    return {
      consumed: Number(quota.consumedUsd),
      limit: Number(quota.monthlyLimitUsd),
      percentage: Math.min(
        100,
        (Number(quota.consumedUsd) / Number(quota.monthlyLimitUsd)) * 100,
      ),
      isExceeded: quota.isExceeded,
    };
  }

  // ── Private helpers ───────────────────────────────────────────────────

  private calculateCost(
    promptTokens: number,
    completionTokens: number,
  ): number {
    return (
      (promptTokens / 1000) * COST_INPUT +
      (completionTokens / 1000) * COST_OUTPUT
    );
  }

  private async getOrCreateQuota(tenantId: string): Promise<AiQuotaEntity> {
    const periodStart = format(startOfMonth(new Date()), 'yyyy-MM-dd');
    const repo = this.platformDs.getRepository(AiQuotaEntity);

    let quota = await repo.findOne({ where: { tenantId, periodStart } });

    if (!quota) {
      const tenant = await this.platformDs.getRepository(TenantEntity).findOne({
        where: { id: tenantId },
        select: { id: true, subscriptionPlan: true },
      });

      const limit = tenant ? (PLAN_LIMITS[tenant.subscriptionPlan] ?? 15) : 15;

      quota = await repo.save({
        tenantId,
        periodStart,
        monthlyLimitUsd: limit,
        consumedUsd: 0,
        isExceeded: false,
        featuresEnabled: {},
      });
    }

    return quota;
  }
}
