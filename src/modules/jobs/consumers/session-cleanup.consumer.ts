import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Job } from 'bullmq';

import { QueueName } from '../../../shared/queues/queue-names.constant';
import { DATA_SOURCE_PLATFORM } from 'src/shared/constants/data-source.constants';
import { PlatformSessionEntity } from '../../../database/entities/platform/platform-session.entity';
import { TenantConnectionService } from '../../../database/tenant-connection.service';
import {
  TenantEntity,
  TenantStatus,
} from '../../../database/entities/platform/tenant.entity';
import { SessionEntity } from '../../../database/entities/tenant/session.entity';

@Processor(QueueName.MAINTENANCE, { concurrency: 1 })
export class SessionCleanupConsumer extends WorkerHost {
  private readonly logger = new Logger(SessionCleanupConsumer.name);

  constructor(
    @InjectDataSource(DATA_SOURCE_PLATFORM)
    private readonly platformDs: DataSource,
    private readonly tenantConn: TenantConnectionService,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    this.logger.log('Starting session cleanup job');

    let totalCleaned = 0;

    // 1. Platform sessions
    const platformResult = await this.platformDs
      .getRepository(PlatformSessionEntity)
      .createQueryBuilder()
      .delete()
      .where(
        "(expires_at < NOW() OR revoked_at IS NOT NULL) AND created_at < NOW() - INTERVAL '30 days'",
      )
      .execute();

    totalCleaned += platformResult.affected ?? 0;

    // 2. All active tenant sessions
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
              .from(SessionEntity)
              .where(
                "(expires_at < NOW() OR revoked_at IS NOT NULL) AND created_at < NOW() - INTERVAL '30 days'",
              )
              .execute(),
        );
        totalCleaned += result.affected ?? 0;
      } catch (err) {
        this.logger.error(
          `Session cleanup failed for tenant ${tenant.slug}: ${(err as Error).message}`,
        );
      }
    }

    this.logger.log(
      `Session cleanup complete — removed ${totalCleaned} expired sessions`,
    );
  }
}
