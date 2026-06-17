import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthController } from './auth/auth.controller';
import { AuthService } from './auth/auth.service';
import { TokenService } from './token/token.service';
import { SessionService } from './session/session.service';
import { MfaService } from './mfa/mfa.service';
import { TenantProvisioningService } from './provisioning/tenant-provisioning.service';

// Platform entities used directly by IAM services
import { PlatformUserEntity } from 'src/database/entities/platform';
import { PlatformSessionEntity } from '../../database/entities/platform/platform-session.entity';

import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [
    DatabaseModule,
    // Needed for @InjectRepository(...) if we switch away from raw DataSource
    TypeOrmModule.forFeature(
      [PlatformUserEntity, PlatformSessionEntity],
      'platform',
    ),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    TokenService,
    SessionService,
    MfaService,
    TenantProvisioningService,
  ],
  exports: [AuthService, TokenService, TenantProvisioningService],
})
export class IamModule {}
