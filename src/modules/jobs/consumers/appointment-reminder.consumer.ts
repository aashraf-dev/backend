import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';

import { QueueName } from '../../../shared/queues/queue-names.constant';
import { JobName } from '../../../shared/queues/job-names.constant';
import { TenantConnectionService } from '../../../database/tenant-connection.service';
import {
  AppointmentEntity,
  AppointmentStatus,
} from '../../../database/entities/tenant/appointment.entity';
import { NotificationProducer } from '../producers/notification.producer';
import { IAppointmentReminderJob, IEmailDispatchJob } from '../interfaces';

@Processor(QueueName.APPOINTMENTS, {
  concurrency: 10,
})
export class AppointmentReminderConsumer extends WorkerHost {
  private readonly logger = new Logger(AppointmentReminderConsumer.name);

  constructor(
    private readonly tenantConn: TenantConnectionService,
    private readonly notificationProducer: NotificationProducer,
  ) {
    super();
  }

  async process(job: Job<IAppointmentReminderJob>): Promise<void> {
    const data = job.data;

    this.logger.log(
      `Processing ${data.reminderHours}h reminder for appointment ` +
        `${data.appointmentId} (tenant: ${data.tenantSchema})`,
    );

    // Double-check the appointment is still SCHEDULED or CONFIRMED
    const appt = await this.tenantConn.runInTenantSchema(
      data.tenantSchema,
      (em) =>
        em.findOne(AppointmentEntity, {
          where: { id: data.appointmentId },
        }),
    );

    if (!appt) {
      this.logger.warn(
        `Appointment ${data.appointmentId} not found — skipping reminder`,
      );
      return;
    }

    if (
      appt.status === AppointmentStatus.CANCELLED ||
      appt.status === AppointmentStatus.COMPLETED ||
      appt.status === AppointmentStatus.NO_SHOW
    ) {
      this.logger.log(
        `Appointment ${data.appointmentId} is ${appt.status} — reminder skipped`,
      );
      return;
    }

    // Dispatch the email
    const emailPayload: IEmailDispatchJob = {
      to: data.ownerEmail,
      subject: `Appointment Reminder — ${data.petName} at ${data.tenantName}`,
      template: 'appointment-reminder',
      context: data as unknown as Record<string, unknown>,
    };

    await this.notificationProducer.queueEmail(emailPayload);

    this.logger.log(
      `Reminder email queued for appointment ${data.appointmentId} → ${data.ownerEmail}`,
    );
  }
}
