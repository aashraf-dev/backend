import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';

import { DATA_SOURCE_PLATFORM } from 'src/shared/constants/data-source.constants';
import {
  TenantEntity,
  TenantStatus,
} from '../../../database/entities/platform/tenant.entity';
import { TenantConnectionService } from '../../../database/tenant-connection.service';
import { NotificationProducer } from '../producers/notification.producer';
import { MaintenanceProducer } from '../producers/maintenance.producer';
import { ClinicalProducer } from '../producers/clinical.producer';
import { IAppointmentReminderJob } from '../interfaces';

@Injectable()
export class JobSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(JobSchedulerService.name);
  private readonly reminderHours: number[];
  private readonly expiryWarningDays: number[];

  constructor(
    @InjectDataSource(DATA_SOURCE_PLATFORM)
    private readonly platformDs: DataSource,
    private readonly tenantConn: TenantConnectionService,
    private readonly notificationProducer: NotificationProducer,
    private readonly maintenanceProducer: MaintenanceProducer,
    private readonly clinicalProducer: ClinicalProducer,
    private readonly configService: ConfigService,
  ) {
    this.reminderHours = this.configService.get<number[]>(
      'app.jobs.appointmentReminderHours',
    )!;
    this.expiryWarningDays = this.configService.get<number[]>(
      'app.jobs.subscriptionExpiryWarningDays',
    )!;
  }

  async onModuleInit(): Promise<void> {
    this.logger.log(
      `JobSchedulerService initialised — ` +
        `reminder windows: [${this.reminderHours.join('h, ')}h], ` +
        `expiry warnings: [${this.expiryWarningDays.join(', ')}d]`,
    );
  }

  // ─────────────────────────────────────────────────────────────────
  // APPOINTMENT REMINDERS
  // Every 15 minutes — scan for upcoming appointments needing reminders
  // ─────────────────────────────────────────────────────────────────

  @Cron('*/15 * * * *', { name: 'appointment-reminder-scan' })
  async scheduleAppointmentReminders(): Promise<void> {
    this.logger.debug('Running appointment reminder scan');

    const activeTenants = await this.getActiveTenants();

    for (const tenant of activeTenants) {
      try {
        await this.scheduleRemindersForTenant(tenant);
      } catch (err) {
        this.logger.error(
          `Reminder scan failed for tenant ${tenant.slug}: ${(err as Error).message}`,
        );
      }
    }
  }

  private async scheduleRemindersForTenant(
    tenant: TenantEntity,
  ): Promise<void> {
    // Find appointments that fall within any reminder window
    // and haven't been reminded yet (we use deterministic jobIds to prevent duplication)
    const appointments: any[] = await this.tenantConn.runInTenantSchema(
      tenant.schemaName,
      (em) =>
        em.query(
          `SELECT
             a.id,
             a.scheduled_at,
             a.duration_minutes,
             a.status,
             p.name        AS pet_name,
             s.name        AS service_name,
             u_owner.email AS owner_email,
             u_owner.first_name AS owner_first_name,
             CONCAT(u_vet.first_name, ' ', u_vet.last_name) AS vet_name
           FROM appointments a
           JOIN pets p ON p.id = a.pet_id
           JOIN owner_profiles op ON op.id = p.owner_id
           JOIN users u_owner ON u_owner.id = op.user_id
           JOIN users u_vet   ON u_vet.id   = a.vet_id
           LEFT JOIN clinic_services s ON s.id = a.service_id
           WHERE a.status IN ('scheduled', 'confirmed')
             AND a.scheduled_at > NOW()
             AND a.scheduled_at <= NOW() + INTERVAL '${Math.max(...this.reminderHours) + 1} hours'
             AND a.deleted_at IS NULL`,
        ),
    );

    let scheduled = 0;

    for (const appt of appointments) {
      for (const hours of this.reminderHours) {
        const fireAt = new Date(
          new Date(appt.scheduled_at).getTime() - hours * 60 * 60 * 1000,
        );

        const payload: IAppointmentReminderJob = {
          appointmentId: appt.id,
          tenantId: tenant.id,
          tenantSchema: tenant.schemaName,
          tenantName: tenant.name,
          petName: appt.pet_name,
          ownerEmail: appt.owner_email,
          ownerFirstName: appt.owner_first_name,
          vetName: appt.vet_name,
          serviceName: appt.service_name ?? null,
          scheduledAt: new Date(appt.scheduled_at).toISOString(),
          durationMinutes: appt.duration_minutes,
          reminderHours: hours,
        };

        await this.notificationProducer.scheduleAppointmentReminder(
          payload,
          fireAt,
        );
        scheduled++;
      }
    }

    if (scheduled > 0) {
      this.logger.debug(
        `Scheduled ${scheduled} reminder job(s) for tenant ${tenant.slug}`,
      );
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // PRESCRIPTION EXPIRY — Daily at 06:00 UTC
  // ─────────────────────────────────────────────────────────────────

  @Cron('0 6 * * *', { name: 'prescription-expiry-daily' })
  async runPrescriptionExpiryCheck(): Promise<void> {
    this.logger.log('Running daily prescription expiry check');
    const tenants = await this.getActiveTenants();

    for (const tenant of tenants) {
      await this.clinicalProducer.queuePrescriptionExpiryCheck(
        tenant.schemaName,
      );
    }

    this.logger.log(
      `Queued prescription expiry jobs for ${tenants.length} tenant(s)`,
    );
  }

  // ─────────────────────────────────────────────────────────────────
  // FOLLOW-UP OVERDUE — Daily at 07:00 UTC
  // ─────────────────────────────────────────────────────────────────

  @Cron('0 7 * * *', { name: 'follow-up-overdue-daily' })
  async runFollowUpOverdueCheck(): Promise<void> {
    this.logger.log('Running daily follow-up overdue check');
    const tenants = await this.getActiveTenants();

    for (const tenant of tenants) {
      await this.clinicalProducer.queueFollowUpOverdueCheck(tenant.schemaName);
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // SUBSCRIPTION EXPIRY — Daily at 08:00 UTC
  // ─────────────────────────────────────────────────────────────────

  @Cron('0 8 * * *', { name: 'subscription-expiry-daily' })
  async runSubscriptionExpiryWarnings(): Promise<void> {
    this.logger.log('Running daily subscription expiry check');

    const expiringTenants: any[] = await this.platformDs.query(`
      SELECT
        t.id,
        t.name,
        t.contact_email,
        t.subscription_plan,
        t.subscription_expires_at,
        EXTRACT(DAY FROM (t.subscription_expires_at - NOW()))::int AS days_remaining
      FROM tenants t
      WHERE t.status = 'active'
        AND t.subscription_expires_at IS NOT NULL
        AND t.subscription_expires_at >= NOW()
        AND t.subscription_expires_at <= NOW() + INTERVAL '${Math.max(...this.expiryWarningDays)} days'
        AND t.deleted_at IS NULL
      ORDER BY t.subscription_expires_at ASC
    `);

    let queued = 0;

    for (const tenant of expiringTenants) {
      const daysRemaining = parseInt(tenant.days_remaining, 10);

      if (!this.expiryWarningDays.includes(daysRemaining)) continue;

      await this.clinicalProducer.queueSubscriptionExpiryWarning({
        tenantId: tenant.id,
        tenantName: tenant.name,
        contactEmail: tenant.contact_email,
        subscriptionPlan: tenant.subscription_plan,
        expiresAt: new Date(tenant.subscription_expires_at).toISOString(),
        daysRemaining,
      });

      queued++;
    }

    this.logger.log(
      `Subscription expiry: queued ${queued} warning(s) for configured days [${this.expiryWarningDays.join(', ')}]`,
    );
  }

  // ─────────────────────────────────────────────────────────────────
  // SESSION CLEANUP — Daily at 02:00 UTC
  // ─────────────────────────────────────────────────────────────────

  @Cron('0 2 * * *', { name: 'session-cleanup-daily' })
  async runSessionCleanup(): Promise<void> {
    this.logger.log('Queuing daily session cleanup');
    await this.maintenanceProducer.queueSessionCleanup();
  }

  // ─────────────────────────────────────────────────────────────────
  // AUDIT LOG ARCHIVE — Weekly Sunday at 03:00 UTC
  // ─────────────────────────────────────────────────────────────────

  @Cron('0 3 * * 0', { name: 'audit-archive-weekly' })
  async runAuditLogArchive(): Promise<void> {
    this.logger.log('Queuing weekly audit log archive');
    await this.maintenanceProducer.queueAuditLogArchive(365);
  }

  // ─────────────────────────────────────────────────────────────────
  // SOFT DELETE PURGE — Monthly on 1st at 04:00 UTC
  // ─────────────────────────────────────────────────────────────────

  @Cron('0 4 1 * *', { name: 'soft-delete-purge-monthly' })
  async runSoftDeletePurge(): Promise<void> {
    this.logger.log('Queuing monthly soft-delete purge');
    await this.maintenanceProducer.queueSoftDeletePurge(90); // Keep 90 days
  }

  // ── Private helpers ────────────────────────────────────────────

  private async getActiveTenants(): Promise<TenantEntity[]> {
    return this.platformDs.getRepository(TenantEntity).find({
      where: { status: TenantStatus.ACTIVE },
      select: {
        id: true,
        slug: true,
        name: true,
        schemaName: true,
        contactEmail: true,
      },
    });
  }
}
