import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';

import { QueueName } from '../../../shared/queues/queue-names.constant';
import { JobName } from '../../../shared/queues/job-names.constant';

@Injectable()
export class ClinicalProducer {
  private readonly logger = new Logger(ClinicalProducer.name);

  constructor(
    @InjectQueue(QueueName.CLINICAL)
    private readonly clinicalQueue: Queue,

    @InjectQueue(QueueName.SUBSCRIPTIONS)
    private readonly subscriptionsQueue: Queue,
  ) {}

  async queuePrescriptionExpiryCheck(tenantSchema: string): Promise<void> {
    await this.clinicalQueue.add(
      JobName.PRESCRIPTION_EXPIRY_CHECK,
      { tenantSchema },
      {
        jobId: `rx-expiry-${tenantSchema}-${new Date().toISOString().split('T')[0]}`,
        attempts: 2,
      },
    );
  }

  async queueFollowUpOverdueCheck(tenantSchema: string): Promise<void> {
    await this.clinicalQueue.add(
      JobName.FOLLOW_UP_OVERDUE_CHECK,
      { tenantSchema },
      {
        jobId: `followup-overdue-${tenantSchema}-${new Date().toISOString().split('T')[0]}`,
        attempts: 2,
      },
    );
  }

  async queueSubscriptionExpiryWarning(payload: {
    tenantId: string;
    tenantName: string;
    contactEmail: string;
    subscriptionPlan: string;
    expiresAt: string;
    daysRemaining: number;
  }): Promise<void> {
    await this.subscriptionsQueue.add(
      JobName.SUBSCRIPTION_EXPIRY_WARNING,
      payload,
      {
        jobId: `sub-warning-${payload.tenantId}-${payload.daysRemaining}d`,
        attempts: 3,
        backoff: { type: 'exponential', delay: 30_000 },
      },
    );
  }
}
