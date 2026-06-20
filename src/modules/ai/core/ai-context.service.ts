import { Injectable, Logger } from '@nestjs/common';
import { TenantConnectionService } from '../../../database/tenant-connection.service';
import { RedisService } from '../../../shared/redis/redis.service';
import { format } from 'date-fns';

/** Builds a per-tenant knowledge context injected into every AI prompt */
@Injectable()
export class AiContextService {
  private readonly logger = new Logger(AiContextService.name);
  private readonly TTL = 600; // 10 minutes

  constructor(
    private readonly tenantConn: TenantConnectionService,
    private readonly redis: RedisService,
  ) {}

  async buildClinicContext(
    schema: string,
    tenantName: string,
  ): Promise<string> {
    const key = `ai:ctx:${schema}`;
    const cached = await this.redis.get(key);
    if (cached) return cached;

    const ctx = await this.tenantConn.runInTenantSchema(schema, async (em) => {
      const [services, vets, today]: [any[], any[], any[]] = await Promise.all([
        em.query(`
          SELECT name, description, duration_minutes, price, category
          FROM clinic_services
          WHERE is_active = TRUE
          ORDER BY category, name
          LIMIT 30
        `),
        em.query(`
          SELECT u.first_name, u.last_name, d.name AS designation
          FROM users u
          LEFT JOIN designations d ON d.id = u.designation_id
          WHERE u.user_type IN ('veterinarian', 'clinic_owner')
            AND u.is_active = TRUE
          ORDER BY u.first_name
          LIMIT 20
        `),
        em.query(`
          SELECT COUNT(*) AS total,
            COUNT(*) FILTER (WHERE status IN ('scheduled','confirmed')) AS upcoming
          FROM appointments
          WHERE DATE(scheduled_at AT TIME ZONE 'UTC') = CURRENT_DATE
            AND deleted_at IS NULL
        `),
      ]);

      const serviceList = services
        .map(
          (s) =>
            `- ${s.name} (${s.duration_minutes}min${s.price ? `, $${s.price}` : ''})` +
            (s.description ? `: ${s.description}` : ''),
        )
        .join('\n');

      const vetList = vets
        .map(
          (v) =>
            `- Dr. ${v.first_name} ${v.last_name}` +
            (v.designation ? ` (${v.designation})` : ''),
        )
        .join('\n');

      const todayStats = today[0];

      return `
CLINIC: ${tenantName}
TODAY: ${format(new Date(), 'EEEE, MMMM d, yyyy')}
TODAY'S APPOINTMENTS: ${todayStats.total} total, ${todayStats.upcoming} upcoming

AVAILABLE SERVICES:
${serviceList || 'Contact clinic for service information'}

OUR VETERINARIANS:
${vetList || 'Contact clinic for staff information'}

BOOKING POLICY:
- Appointments must be booked at least 2 hours in advance
- Cancellations require 24 hours notice
- Emergency cases are always accepted
      `.trim();
    });

    await this.redis.set(key, ctx, this.TTL);
    return ctx;
  }
}
