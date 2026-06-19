import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';

import { QueueName } from '../../../shared/queues/queue-names.constant';
import { JobName } from '../../../shared/queues/job-names.constant';
import { TenantConnectionService } from '../../../database/tenant-connection.service';
import {
  PrescriptionEntity,
  PrescriptionStatus,
} from '../../../database/entities/tenant/prescription.entity';
import { NotificationProducer } from '../producers/notification.producer';
import { IEmailDispatchJob } from '../interfaces';

interface IPrescriptionExpiryCheckJob {
  tenantSchema: string;
}

@Processor(QueueName.CLINICAL, { concurrency: 5 })
export class PrescriptionExpiryConsumer extends WorkerHost {
  private readonly logger = new Logger(PrescriptionExpiryConsumer.name);

  constructor(
    private readonly tenantConn: TenantConnectionService,
    private readonly notificationProducer: NotificationProducer,
  ) {
    super();
  }

  async process(job: Job<IPrescriptionExpiryCheckJob>): Promise<void> {
    const { tenantSchema } = job.data;

    this.logger.log(
      `Running prescription expiry check for schema: ${tenantSchema}`,
    );

    // 1. Mark expired prescriptions as EXPIRED
    const expiredResult = await this.tenantConn.runInTenantSchema(
      tenantSchema,
      (em) =>
        em
          .createQueryBuilder()
          .update(PrescriptionEntity)
          .set({ status: PrescriptionStatus.EXPIRED })
          .where('status = :active', { active: PrescriptionStatus.ACTIVE })
          .andWhere('end_date IS NOT NULL')
          .andWhere('end_date < CURRENT_DATE')
          .execute(),
    );

    if (expiredResult.affected && expiredResult.affected > 0) {
      this.logger.log(
        `Marked ${expiredResult.affected} prescription(s) as EXPIRED in ${tenantSchema}`,
      );
    }

    // 2. Notify pet owners of prescriptions expiring within 3 days
    const expiringSoon: any[] = await this.tenantConn.runInTenantSchema(
      tenantSchema,
      (em) =>
        em.query(
          `SELECT
             rx.id,
             rx.medication_name,
             rx.end_date,
             p.name AS pet_name,
             u.email AS owner_email,
             u.first_name AS owner_first_name
           FROM prescriptions rx
           JOIN pets p ON p.id = rx.pet_id
           JOIN owner_profiles op ON op.id = p.owner_id
           JOIN users u ON u.id = op.user_id
           WHERE rx.status = 'active'
             AND rx.end_date IS NOT NULL
             AND rx.end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '3 days'
             AND rx.deleted_at IS NULL`,
        ),
    );

    for (const row of expiringSoon) {
      const emailPayload: IEmailDispatchJob = {
        to: row.owner_email,
        subject: `Prescription Expiring Soon — ${row.pet_name}`,
        template: 'prescription-expiry',
        context: {
          ownerFirstName: row.owner_first_name,
          petName: row.pet_name,
          medicationName: row.medication_name,
          endDate: row.end_date,
          tenantSchema,
        },
      };

      await this.notificationProducer.queueEmail(emailPayload);
    }

    if (expiringSoon.length > 0) {
      this.logger.log(
        `Queued ${expiringSoon.length} expiry notification(s) for ${tenantSchema}`,
      );
    }
  }
}
