import { Injectable } from '@nestjs/common';
import { TenantConnectionService } from '../../../database/tenant-connection.service';
import { CrmContextService } from '../common/crm-context.service';
import { IJwtPayload } from '../../../shared/interfaces/jwt-payload.interface';
import { UserType } from '../../../shared/enums/user-type.enum';
import { AppointmentStatus } from '../../../database/entities/tenant/appointment.entity';

export interface IDashboardStats {
  today: {
    totalAppointments: number;
    completed: number;
    pending: number;
    cancelled: number;
  };
  upcoming7Days: number;
  pendingFollowUps: number;
  activePatients: number;
  activePrescriptions: number;
  staffOnline: number;
  recentActivity: Array<{
    type: string;
    description: string;
    createdAt: Date;
  }>;
}

@Injectable()
export class DashboardService {
  constructor(
    private readonly crmCtx: CrmContextService,
    private readonly tenantConn: TenantConnectionService,
  ) {}

  async getStats(actor: IJwtPayload): Promise<IDashboardStats> {
    const schema = this.crmCtx.getSchema();

    return this.tenantConn.runInTenantSchema(schema, async (em) => {
      const vetFilter =
        actor.userType === UserType.VETERINARIAN ||
        actor.userType === UserType.VET_INTERN
          ? `AND a.vet_id = '${actor.sub}'`
          : '';

      const [todayStats, upcoming, followUps, patientStats, recentRecords] =
        await Promise.all([
          // Today's appointments
          em.query(`
          SELECT
            COUNT(*)                                                               AS total,
            COUNT(*) FILTER (WHERE status = 'completed')                           AS completed,
            COUNT(*) FILTER (WHERE status IN ('scheduled','confirmed','in_progress')) AS pending,
            COUNT(*) FILTER (WHERE status = 'cancelled')                           AS cancelled
          FROM appointments
          WHERE DATE(scheduled_at AT TIME ZONE 'UTC') = CURRENT_DATE
            AND deleted_at IS NULL
            ${vetFilter}
        `),

          // Appointments in next 7 days (excluding today)
          em.query(`
          SELECT COUNT(*) AS count
          FROM appointments
          WHERE scheduled_at > NOW()
            AND scheduled_at < NOW() + INTERVAL '7 days'
            AND status NOT IN ('cancelled', 'no_show')
            AND deleted_at IS NULL
            ${vetFilter}
        `),

          // Pending follow-ups (records with follow_up_date <= today)
          em.query(`
          SELECT COUNT(*) AS count
          FROM medical_records
          WHERE follow_up_date <= CURRENT_DATE
            AND deleted_at IS NULL
            ${actor.userType === UserType.VETERINARIAN ? `AND attending_vet_id = '${actor.sub}'` : ''}
        `),

          // Patient and prescription stats
          em.query(`
          SELECT
            (SELECT COUNT(*) FROM pets WHERE is_deceased = FALSE AND deleted_at IS NULL)::int AS active_patients,
            (SELECT COUNT(*) FROM prescriptions WHERE status = 'active' AND deleted_at IS NULL)::int AS active_prescriptions,
            (SELECT COUNT(*) FROM users WHERE last_login_at > NOW() - INTERVAL '8 hours' AND user_type != 'pet_owner')::int AS staff_online
        `),

          // Recent medical records (last 7 days)
          em.query(`
          SELECT
            'medical_record' AS type,
            CONCAT(p.name, ' — ', mr.record_type) AS description,
            mr.created_at
          FROM medical_records mr
          JOIN pets p ON p.id = mr.pet_id
          WHERE mr.created_at > NOW() - INTERVAL '7 days'
            AND mr.deleted_at IS NULL
            ${actor.userType === UserType.VETERINARIAN ? `AND mr.attending_vet_id = '${actor.sub}'` : ''}
          ORDER BY mr.created_at DESC
          LIMIT 10
        `),
        ]);

      const today = todayStats[0];
      const patStats = patientStats[0];

      return {
        today: {
          totalAppointments: parseInt(today.total, 10),
          completed: parseInt(today.completed, 10),
          pending: parseInt(today.pending, 10),
          cancelled: parseInt(today.cancelled, 10),
        },
        upcoming7Days: parseInt(upcoming[0].count, 10),
        pendingFollowUps: parseInt(followUps[0].count, 10),
        activePatients: patStats.active_patients,
        activePrescriptions: patStats.active_prescriptions,
        staffOnline: patStats.staff_online,
        recentActivity: recentRecords,
      };
    });
  }
}
