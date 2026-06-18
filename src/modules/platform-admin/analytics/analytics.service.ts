import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { DATA_SOURCE_PLATFORM } from 'src/shared/constants/data-source.constants';
import { AnalyticsQueryDto } from './dto';

export interface ITenantOverviewStats {
  total: number;
  active: number;
  pending: number;
  suspended: number;
  terminated: number;
  newLast7Days: number;
  newLast30Days: number;
  expiringSoon: number; // subscription expiring within 30 days
}

export interface ISubscriptionBreakdown {
  plan: string;
  count: number;
  percentage: number;
}

export interface IMonthlyGrowth {
  month: string; // YYYY-MM
  newTenants: number;
  cumulativeTotal: number;
}

export interface IPlatformUserStats {
  total: number;
  active: number;
  byType: Record<string, number>;
}

export interface IAnalyticsOverview {
  tenants: ITenantOverviewStats;
  subscriptions: ISubscriptionBreakdown[];
  platformUsers: IPlatformUserStats;
  generatedAt: string;
}

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectDataSource(DATA_SOURCE_PLATFORM)
    private readonly platformDs: DataSource,
  ) {}

  // ── Overview dashboard ──────────────────────────────────────────

  async getOverview(): Promise<IAnalyticsOverview> {
    const [tenantStats, subscriptionStats, userStats] = await Promise.all([
      this.getTenantOverviewStats(),
      this.getSubscriptionStats(),
      this.getPlatformUserStats(),
    ]);

    return {
      tenants: tenantStats,
      subscriptions: subscriptionStats,
      platformUsers: userStats,
      generatedAt: new Date().toISOString(),
    };
  }

  // ── Tenant growth over time ──────────────────────────────────────

  async getTenantGrowth(query: AnalyticsQueryDto): Promise<IMonthlyGrowth[]> {
    const rows: Array<{
      month: string;
      new_tenants: string;
    }> = await this.platformDs.query(
      `
      WITH months AS (
        SELECT
          TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM') AS month,
          COUNT(*)                                              AS new_tenants
        FROM tenants
        WHERE
          created_at >= DATE_TRUNC('month', NOW()) - (($1 - 1) || ' months')::INTERVAL
          AND deleted_at IS NULL
        GROUP BY DATE_TRUNC('month', created_at)
        ORDER BY DATE_TRUNC('month', created_at)
      )
      SELECT
        month,
        new_tenants,
        SUM(new_tenants) OVER (ORDER BY month ROWS UNBOUNDED PRECEDING) AS cumulative
      FROM months
      `,
      [query.months],
    );

    return rows.map((r, i) => ({
      month: r.month,
      newTenants: parseInt(r.new_tenants, 10),
      cumulativeTotal: rows
        .slice(0, i + 1)
        .reduce((sum, row) => sum + parseInt(row.new_tenants, 10), 0),
    }));
  }

  // ── Private: aggregation queries ─────────────────────────────────

  private async getTenantOverviewStats(): Promise<ITenantOverviewStats> {
    const result: Array<{
      total: string;
      active: string;
      pending: string;
      suspended: string;
      terminated: string;
      new_7d: string;
      new_30d: string;
      expiring_soon: string;
    }> = await this.platformDs.query(`
      SELECT
        COUNT(*)                                                    AS total,
        COUNT(*) FILTER (WHERE status = 'active')                   AS active,
        COUNT(*) FILTER (WHERE status = 'pending')                  AS pending,
        COUNT(*) FILTER (WHERE status = 'suspended')                AS suspended,
        COUNT(*) FILTER (WHERE status = 'terminated')               AS terminated,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days')   AS new_7d,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days')  AS new_30d,
        COUNT(*) FILTER (
          WHERE subscription_expires_at BETWEEN NOW() AND NOW() + INTERVAL '30 days'
            AND status = 'active'
        )                                                           AS expiring_soon
      FROM tenants
      WHERE deleted_at IS NULL
    `);

    const r = result[0];
    return {
      total: parseInt(r.total, 10),
      active: parseInt(r.active, 10),
      pending: parseInt(r.pending, 10),
      suspended: parseInt(r.suspended, 10),
      terminated: parseInt(r.terminated, 10),
      newLast7Days: parseInt(r.new_7d, 10),
      newLast30Days: parseInt(r.new_30d, 10),
      expiringSoon: parseInt(r.expiring_soon, 10),
    };
  }

  private async getSubscriptionStats(): Promise<ISubscriptionBreakdown[]> {
    const rows: Array<{ plan: string; count: string }> = await this.platformDs
      .query(`
      SELECT
        subscription_plan AS plan,
        COUNT(*)           AS count
      FROM tenants
      WHERE deleted_at IS NULL
        AND status != 'terminated'
      GROUP BY subscription_plan
      ORDER BY count DESC
    `);

    const total = rows.reduce((sum, r) => sum + parseInt(r.count, 10), 0);

    return rows.map((r) => ({
      plan: r.plan,
      count: parseInt(r.count, 10),
      percentage:
        total > 0
          ? Math.round((parseInt(r.count, 10) / total) * 100 * 10) / 10
          : 0,
    }));
  }

  private async getPlatformUserStats(): Promise<IPlatformUserStats> {
    const rows: Array<{
      user_type: string;
      total: string;
      active: string;
    }> = await this.platformDs.query(`
      SELECT
        user_type,
        COUNT(*)                                    AS total,
        COUNT(*) FILTER (WHERE is_active = TRUE)    AS active
      FROM platform_users
      WHERE deleted_at IS NULL
      GROUP BY user_type
    `);

    const totalCount = rows.reduce((s, r) => s + parseInt(r.total, 10), 0);
    const activeCount = rows.reduce((s, r) => s + parseInt(r.active, 10), 0);

    const byType = rows.reduce<Record<string, number>>((acc, r) => {
      acc[r.user_type] = parseInt(r.total, 10);
      return acc;
    }, {});

    return { total: totalCount, active: activeCount, byType };
  }
}
