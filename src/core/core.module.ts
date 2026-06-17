import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';

import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';

import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RbacGuard } from './guards/rbac.guard';
import { AppContextGuard } from './guards/app-context.guard';

import { AuditLogInterceptor } from './interceptors/audit-log.interceptor';
import { TransformInterceptor } from './interceptors/transform.interceptor';
import { TimeoutInterceptor } from './interceptors/timeout.interceptor';

import { PermissionResolverService } from './servicese/permission-resolver.service';

import { DatabaseModule } from '../database/database.module';
import { RedisModule } from '../shared/redis/redis.module';

@Global()
@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        secret: cfg.get<string>('auth.jwt.accessSecret'),
        signOptions: {
          expiresIn: cfg.get<string>('auth.jwt.accessExpiry') || '15m',
        },
      }),
    }),
    DatabaseModule,
    RedisModule,
  ],
  providers: [
    // Passport strategies
    JwtStrategy,
    LocalStrategy,

    // ── NEW ───────────────────────────────────────
    PermissionResolverService,

    // Guards — order is enforced by NestJS APP_GUARD registration order
    { provide: APP_GUARD, useClass: JwtAuthGuard }, // 1. Authenticate
    { provide: APP_GUARD, useClass: AppContextGuard }, // 2. Check app surface
    { provide: APP_GUARD, useClass: RbacGuard }, // 3. Check permissions

    // Interceptors
    { provide: APP_INTERCEPTOR, useClass: TimeoutInterceptor },
    { provide: APP_INTERCEPTOR, useClass: AuditLogInterceptor },
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
  ],
  exports: [
    JwtModule,
    PassportModule,
    PermissionResolverService, // Exported so IAM module can use it during token issuance
  ],
})
export class CoreModule {}
