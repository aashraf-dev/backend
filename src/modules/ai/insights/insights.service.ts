import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { format } from 'date-fns';

import { AiProviderService } from '../core/ai-provider.service';
import { AiCostGuardService } from '../core/ai-cost-guard.service';
import { TenantConnectionService } from '../../../database/tenant-connection.service';
import { TenantRepositoryFactory } from '../../../database/tenant-repository';
import { AiInsightEntity } from '../entities/tenant/ai-insight.entity';
import { DATA_SOURCE_PLATFORM } from 'src/shared/constants/data-source.constants';
import {
  TenantEntity,
  TenantStatus,
} from '../../../database/entities/platform/tenant.entity';

const INSIGHTS_SYSTEM_PROMPT = `You are a veterinary practice analytics AI.
Analyze the provided clinic data and generate actionable insights.

Focus on:
- No-show risk patterns
- Revenue optimization opportunities
- Client churn indicators
- Appointment utilization
- Staff workload balance
- Patient health alerts (e.g., overdue follow-ups)

For each insight provide:
1. A clear, actionable title
2. A plain-language explanation
3. Supporting data points
4. A specific recommended action
5. Confidence score 0-1

Respond ONLY with valid JSON array:
[
  {
    "category": "no_show_risk|revenue_opportunity|churn_risk|workload_balance|appointment_trend|patient_health_alert",
    "severity": "info|warning|critical",
    "title": "...",
    "explanation": "...",
    "supportingData": { "key": "value" },
    "recommendedAction": "...",
    "confidence": 0.85
  }
]

Generate 3-5 insights maximum. Only include insights with confidence > 0.6.`;

@Injectable()
export class InsightsService {
  private readonly logger = new Logger(InsightsService.name);

  constructor(
    private readonly ai: AiProviderService,
    private readonly costGuard: AiCostGuardService,
    private readonly tenantConn: TenantConnectionService,
    private readonly repoFactory: TenantRepositoryFactory,
    @InjectDataSource(DATA_SOURCE_PLATFORM)
    private readonly platformDs: DataSource,
  ) {}

  async generateForTenant(schema: string, tenantId: string): Promise<void> {
    await this.costGuard.assertQuotaAvailable(tenantId);

    const clinicData = await this.gatherClinicData(schema);

    const aiResponse = await this.ai.complete({
      messages: [
        { role: 'system', content: INSIGHTS_SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Analyze this veterinary clinic data:\n\n${JSON.stringify(clinicData, null, 2)}`,
        },
      ],
      temperature: 0.3,
      maxTokens: 1500,
      jsonMode: true,
    });

    await this.costGuard.recordUsage(
      tenantId,
      null,
      'insights_generation',
      aiResponse,
    );

    let insights: any[];
    try {
      const parsed = this.ai.parseJson<any>(aiResponse.content);
      insights = Array.isArray(parsed) ? parsed : (parsed.insights ?? []);
    } catch {
      this.logger.warn(`Failed to parse insights for tenant ${tenantId}`);
      return;
    }

    const today = format(new Date(), 'yyyy-MM-dd');

    for (const insight of insights) {
      if (!insight.confidence || insight.confidence < 0.6) continue;

      await this.repoFactory.for(AiInsightEntity, schema).save({
        category: insight.category ?? 'appointment_trend',
        severity: insight.severity ?? 'info',
        title: insight.title,
        explanation: insight.explanation,
        supportingData: insight.supportingData ?? {},
        recommendedAction: insight.recommendedAction ?? null,
        confidence: insight.confidence,
        isRead: false,
        isDismissed: false,
        generatedForDate: today,
      });
    }

    this.logger.log(
      `Generated ${insights.length} insights for schema ${schema}`,
    );
  }

  async getInsights(
    schema: string,
    includeDismissed = false,
  ): Promise<AiInsightEntity[]> {
    return this.tenantConn.runInTenantSchema(schema, (em) => {
      const qb = em
        .createQueryBuilder(AiInsightEntity, 'i')
        .where('i.is_dismissed = :dismissed', { dismissed: includeDismissed });

      if (!includeDismissed) {
        qb.andWhere('i.is_dismissed = false');
      }

      return qb
        .orderBy('i.severity', 'DESC')
        .addOrderBy('i.confidence', 'DESC')
        .addOrderBy('i.created_at', 'DESC')
        .take(20)
        .getMany();
    });
  }

  async markRead(schema: string, insightId: string): Promise<void> {
    await this.repoFactory
      .for(AiInsightEntity, schema)
      .update(insightId, { isRead: true });
  }

  async dismiss(schema: string, insightId: string): Promise<void> {
    await this.repoFactory
      .for(AiInsightEntity, schema)
      .update(insightId, { isDismissed: true });
  }

  async generateForAllTenants(): Promise<void> {
    const tenants = await this.platformDs.getRepository(TenantEntity).find({
      where: { status: TenantStatus.ACTIVE },
      select: { id: true, schemaName: true },
    });

    for (const tenant of tenants) {
      try {
        await this.generateForTenant(tenant.schemaName, tenant.id);
      } catch (err) {
        this.logger.error(
          `Insights generation failed for ${tenant.schemaName}: ${(err as Error).message}`,
        );
      }
    }
  }

  private async gatherClinicData(
    schema: string,
  ): Promise<Record<string, unknown>> {
    return this.tenantConn.runInTenantSchema(schema, async (em) => {
      const [apptStats, noShowStats, patientStats, staffStats] =
        await Promise.all([
          // Appointment trends last 30 days
          em.query(`
          SELECT
            DATE_TRUNC('week', scheduled_at)::date AS week,
            COUNT(*) AS total,
            COUNT(*) FILTER (WHERE status = 'completed') AS completed,
            COUNT(*) FILTER (WHERE status = 'cancelled') AS cancelled,
            COUNT(*) FILTER (WHERE status = 'no_show') AS no_shows
          FROM appointments
          WHERE scheduled_at > NOW() - INTERVAL '30 days'
            AND deleted_at IS NULL
          GROUP BY 1 ORDER BY 1
        `),

          // No-show rate by hour of day
          em.query(`
          SELECT
            EXTRACT(HOUR FROM scheduled_at) AS hour_of_day,
            COUNT(*) AS total,
            COUNT(*) FILTER (WHERE status = 'no_show') AS no_shows,
            ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'no_show') / NULLIF(COUNT(*), 0), 1) AS no_show_pct
          FROM appointments
          WHERE scheduled_at > NOW() - INTERVAL '60 days'
            AND deleted_at IS NULL
          GROUP BY 1 ORDER BY 4 DESC LIMIT 5
        `),

          // Patient engagement
          em.query(`
          SELECT
            COUNT(*) AS total_active_patients,
            COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days') AS new_last_30d,
            (SELECT COUNT(*) FROM appointments
             WHERE scheduled_at < NOW() - INTERVAL '90 days'
               AND status = 'completed'
               AND pet_id NOT IN (
                 SELECT pet_id FROM appointments
                 WHERE scheduled_at > NOW() - INTERVAL '90 days'
               )
            ) AS potentially_churned
          FROM pets WHERE is_deceased = FALSE AND deleted_at IS NULL
        `),

          // Staff utilization
          em.query(`
          SELECT
            u.first_name || ' ' || u.last_name AS vet_name,
            COUNT(a.id) AS total_appointments,
            COUNT(a.id) FILTER (WHERE a.scheduled_at > NOW()) AS upcoming,
            COUNT(a.id) FILTER (WHERE a.status = 'completed' AND a.scheduled_at > NOW() - INTERVAL '7 days') AS completed_this_week
          FROM users u
          LEFT JOIN appointments a ON a.vet_id = u.id AND a.deleted_at IS NULL
          WHERE u.user_type IN ('veterinarian', 'clinic_owner')
            AND u.is_active = TRUE
          GROUP BY 1 ORDER BY 2 DESC
        `),
        ]);

      return {
        appointmentTrends: apptStats,
        noShowPatterns: noShowStats,
        patientStats: patientStats[0] ?? {},
        staffUtilization: staffStats,
        dataDate: format(new Date(), 'yyyy-MM-dd'),
      };
    });
  }
}
