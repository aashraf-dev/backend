import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';

import { QueueName } from '../../../shared/queues/queue-names.constant';
import { JobName } from '../../../shared/queues/job-names.constant';

@Injectable()
export class MaintenanceProducer {
  private readonly logger = new Logger(MaintenanceProducer.name);

  constructor(
    @InjectQueue(QueueName.MAINTENANCE)
    private readonly maintenanceQueue: Queue,
  ) {}

  async queueSessionCleanup(): Promise<void> {
    await this.maintenanceQueue.add(
      JobName.SESSION_CLEANUP,
      {},
      {
        jobId: `session-cleanup-${new Date().toISOString().split('T')[0]}`,
        attempts: 2,
      },
    );
  }

  async queueAuditLogArchive(retentionDays: number): Promise<void> {
    await this.maintenanceQueue.add(
      JobName.AUDIT_LOG_ARCHIVE,
      { retentionDays },
      {
        jobId: `audit-archive-${new Date().toISOString().split('T')[0]}`,
        attempts: 2,
      },
    );
  }

  async queueSoftDeletePurge(retentionDays: number): Promise<void> {
    await this.maintenanceQueue.add(
      JobName.SOFT_DELETE_PURGE,
      { retentionDays },
      {
        jobId: `soft-delete-purge-${new Date().toISOString().split('T')[0]}`,
        attempts: 2,
      },
    );
  }
}
