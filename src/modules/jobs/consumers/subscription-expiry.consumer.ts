import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Job } from 'bullmq';

import { QueueName } from '../../../shared/queues/queue-names.constant';
import { JobName } from '../../../shared/queues/job-names.constant';
// import { DATA_SOURCE_PLATFORM } from '../../../database/data-source.constants';
import { DATA_SOURCE_PLATFORM } from 'src/shared/constants/data-source.constants';
import {
  TenantEntity,
  TenantStatus,
} from '../../../database/entities/platform/tenant.entity';
import { NotificationProducer } from '../producers/notification.producer';
import { ISubscriptionExpiryJob, IEmailDispatchJob } from '../interfaces';

@Processor(QueueName.SUBSCRIPTIONS, { concurrency: 3 })
export class SubscriptionExpiryConsumer extends WorkerHost {
  private readonly logger = new Logger(SubscriptionExpiryConsumer.name);

  constructor(
    @InjectDataSource(DATA_SOURCE_PLATFORM)
    private readonly platformDs: DataSource,
    private readonly notificationProducer: NotificationProducer,
  ) {
    super();
  }

  async process(job: Job<ISubscriptionExpiryJob>): Promise<void> {
    const data = job.data;

    this.logger.log(
      `Processing subscription expiry warning for tenant ${data.tenantId} ` +
        `(${data.daysRemaining}d remaining)`,
    );

    // Verify tenant is still active before sending
    const tenant = await this.platformDs
      .getRepository(TenantEntity)
      .findOne({ where: { id: data.tenantId } });

    if (!tenant || tenant.status !== TenantStatus.ACTIVE) {
      this.logger.warn(
        `Tenant ${data.tenantId} is not active — skipping expiry warning`,
      );
      return;
    }

    const emailPayload: IEmailDispatchJob = {
      to: data.contactEmail,
      subject:
        data.daysRemaining <= 1
          ? `⚠️ URGENT: Your Vetos subscription expires TODAY — ${data.tenantName}`
          : `Action Required: Subscription expires in ${data.daysRemaining} day(s) — ${data.tenantName}`,
      template: 'subscription-expiry',
      context: data as unknown as Record<string, unknown>,
    };

    await this.notificationProducer.queueEmail(emailPayload);

    this.logger.log(
      `Subscription warning email queued for tenant ${data.tenantId} → ${data.contactEmail}`,
    );
  }
}
