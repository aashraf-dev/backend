import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';

import { QueueName } from '../../../shared/queues/queue-names.constant';
import { JobName } from '../../../shared/queues/job-names.constant';
import { IAppointmentReminderJob, IEmailDispatchJob } from '../interfaces';

@Injectable()
export class NotificationProducer {
  private readonly logger = new Logger(NotificationProducer.name);

  constructor(
    @InjectQueue(QueueName.EMAIL_DISPATCH)
    private readonly emailQueue: Queue,

    @InjectQueue(QueueName.APPOINTMENTS)
    private readonly appointmentsQueue: Queue,
  ) {}

  // ── Email ─────────────────────────────────────────────────────────

  async queueEmail(payload: IEmailDispatchJob): Promise<void> {
    await this.emailQueue.add(JobName.SEND_EMAIL, payload, {
      jobId: `email-${payload.template}-${payload.to}-${Date.now()}`,
      attempts: 5,
      backoff: { type: 'exponential', delay: 3_000 },
    });
    this.logger.debug(`Queued email [${payload.template}] → ${payload.to}`);
  }

  // ── Appointment reminders ─────────────────────────────────────────

  /**
   * Schedule an appointment reminder to fire at a precise time.
   * Delay is calculated from now until the reminder window.
   * BullMQ's `delay` is milliseconds from enqueue time.
   */
  async scheduleAppointmentReminder(
    payload: IAppointmentReminderJob,
    fireAt: Date,
  ): Promise<void> {
    const delayMs = fireAt.getTime() - Date.now();

    if (delayMs <= 0) {
      this.logger.warn(
        `Skipping past-due reminder for appointment ${payload.appointmentId} ` +
          `(${payload.reminderHours}h window already elapsed)`,
      );
      return;
    }

    await this.appointmentsQueue.add(JobName.APPOINTMENT_REMINDER, payload, {
      // Deterministic job ID — prevents duplicate scheduling on restart
      jobId: `appt-reminder-${payload.appointmentId}-${payload.reminderHours}h`,
      delay: delayMs,
      attempts: 3,
      backoff: { type: 'exponential', delay: 10_000 },
    });

    this.logger.log(
      `Scheduled ${payload.reminderHours}h reminder for appt ` +
        `${payload.appointmentId} — fires at ${fireAt.toISOString()}`,
    );
  }

  /**
   * Remove scheduled reminders for a cancelled appointment.
   * Called when appointment status transitions to CANCELLED.
   */
  async removeAppointmentReminders(
    appointmentId: string,
    reminderHourWindows: number[],
  ): Promise<void> {
    for (const hours of reminderHourWindows) {
      const jobId = `appt-reminder-${appointmentId}-${hours}h`;
      const job = await this.appointmentsQueue.getJob(jobId);

      if (job) {
        await job.remove();
        this.logger.log(
          `Removed ${hours}h reminder for cancelled appointment ${appointmentId}`,
        );
      }
    }
  }
}
