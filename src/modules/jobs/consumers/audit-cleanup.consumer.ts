import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Job } from 'bullmq';

import { QueueName } from '../../../shared/queues/queue-names.constant';
import { DATA_SOURCE_PLATFORM } from 'src/shared/constants/data-source.constants';
import { PlatformAuditLogEntity } from 'src/database/entities/platform';
import { TenantConnectionService } from '../../../database/tenant-connection.service';
import {
  TenantEntity,
  TenantStatus,
} from '../../../database/entities/platform/tenant.entity';
import { TenantAuditLogEntity } from '../../../database/entities/tenant/tenant-audit-log.entity';

interface IAuditCleanupJob {
  retentionDays: number;
}

@Processor(QueueName.MAINTENANCE, { concurrency: 1 })
export class AuditCleanupConsumer extends WorkerHost {
  private readonly logger = new Logger(AuditCleanupConsumer.name);

  constructor(
    @InjectDataSource(DATA_SOURCE_PLATFORM)
    private readonly platformDs: DataSource,
    private readonly tenantConn: TenantConnectionService,
  ) {
    super();
  }

  async process(job: Job<IAuditCleanupJob>): Promise<void> {
    const retentionDays = job.data.retentionDays ?? 365;

    this.logger.log(
      `Starting audit log archive — retaining last ${retentionDays} days`,
    );

    let totalArchived = 0;

    // Platform audit logs
    const platformResult = await this.platformDs
      .getRepository(PlatformAuditLogEntity)
      .createQueryBuilder()
      .delete()
      .where(`created_at < NOW() - INTERVAL '${retentionDays} days'`)
      .execute();

    totalArchived += platformResult.affected ?? 0;

    // Tenant audit logs
    const activeTenants = await this.platformDs
      .getRepository(TenantEntity)
      .find({ where: { status: TenantStatus.ACTIVE } });

    for (const tenant of activeTenants) {
      try {
        const result = await this.tenantConn.runInTenantSchema(
          tenant.schemaName,
          (em) =>
            em
              .createQueryBuilder()
              .delete()
              .from(TenantAuditLogEntity)
              .where(`created_at < NOW() - INTERVAL '${retentionDays} days'`)
              .execute(),
        );
        totalArchived += result.affected ?? 0;
      } catch (err) {
        this.logger.error(
          `Audit cleanup failed for ${tenant.slug}: ${(err as Error).message}`,
        );
      }
    }

    this.logger.log(
      `Audit log archive complete — archived ${totalArchived} entries older than ${retentionDays} days`,
    );
  }
}
