import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';
import { IamModule } from '../iam/iam.module';

import { TenantsController } from './tenants/tenants.controller';
import { TenantsService } from './tenants/tenants.service';

import { PlatformUsersController } from './platform-users/platform-users.controller';
import { PlatformUsersService } from './platform-users/platform-users.service';

import { AnalyticsController } from './analytics/analytics.controller';
import { AnalyticsService } from './analytics/analytics.service';

import { AuditController } from './audit/audit.controller';
import { AuditService } from './audit/audit.service';

@Module({
  imports: [
    DatabaseModule, // TenantConnectionService, TenantRepositoryFactory
    IamModule, // TenantProvisioningService
  ],
  controllers: [
    TenantsController,
    PlatformUsersController,
    AnalyticsController,
    AuditController,
  ],
  providers: [
    TenantsService,
    PlatformUsersService,
    AnalyticsService,
    AuditService,
  ],
})
export class PlatformAdminModule {}
