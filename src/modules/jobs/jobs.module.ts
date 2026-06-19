import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DatabaseModule } from '../../database/database.module';
import { BullMQConfigService } from './bullmq-config.service';

import { QueueName } from '../../shared/queues/queue-names.constant';

// Platform entities used by consumers
import { TenantEntity } from '../../database/entities/platform/tenant.entity';
import { PlatformSessionEntity } from '../../database/entities/platform/platform-session.entity';
import { PlatformAuditLogEntity } from 'src/database/entities/platform';

// Email
import { EmailService } from './email/email.service';

// Producers
import { NotificationProducer } from './producers/notification.producer';
import { MaintenanceProducer } from './producers/maintenance.producer';
import { ClinicalProducer } from './producers/clinical.producer';

// Consumers
import { EmailDispatchConsumer } from './consumers/email-dispatch.consumer';
import { AppointmentReminderConsumer } from './consumers/appointment-reminder.consumer';
import { PrescriptionExpiryConsumer } from './consumers/precsription-expiry.consumer';
import { SubscriptionExpiryConsumer } from './consumers/subscription-expiry.consumer';
import { SessionCleanupConsumer } from './consumers/session-cleanup.consumer';
import { AuditCleanupConsumer } from './consumers/audit-cleanup.consumer';

// Scheduler
import { JobSchedulerService } from './schedulers/job-scheduler.service';

// All queue registrations in one place
const QUEUES = BullModule.registerQueue(
  ...[
    QueueName.EMAIL_DISPATCH,
    QueueName.APPOINTMENTS,
    QueueName.CLINICAL,
    QueueName.MAINTENANCE,
    QueueName.SUBSCRIPTIONS,
  ].map((name) => ({ name })),
);

@Module({
  imports: [
    ScheduleModule.forRoot(),

    BullModule.forRootAsync({
      useClass: BullMQConfigService,
    }),

    QUEUES,

    DatabaseModule,

    TypeOrmModule.forFeature(
      [TenantEntity, PlatformSessionEntity, PlatformAuditLogEntity],
      'platform',
    ),
  ],
  providers: [
    // Config
    BullMQConfigService,

    // Email
    EmailService,

    // Producers
    NotificationProducer,
    MaintenanceProducer,
    ClinicalProducer,

    // Consumers
    EmailDispatchConsumer,
    AppointmentReminderConsumer,
    PrescriptionExpiryConsumer,
    SubscriptionExpiryConsumer,
    SessionCleanupConsumer,
    AuditCleanupConsumer,

    // Scheduler
    JobSchedulerService,
  ],
  exports: [
    // Producers are exported so other modules can enqueue jobs
    NotificationProducer,
    MaintenanceProducer,
    ClinicalProducer,
    EmailService,
  ],
})
export class JobsModule {}
