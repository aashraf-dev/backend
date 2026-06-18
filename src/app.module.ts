import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ClsModule } from 'nestjs-cls';

import {
  appConfig,
  authConfig,
  databaseConfig,
  redisConfig,
  throttleConfig,
  envValidationSchema,
} from './config';

import { DatabaseModule } from './database/database.module';
import { CoreModule } from './core/core.module';
import { RedisModule } from './shared/redis/redis.module';
import { IamModule } from './modules/iam/iam.module';
import { PlatformAdminModule } from './modules/platform-admin/platform-admin.module'; // ← NEW
import { TenantResolutionMiddleware } from './core/middleware/tenant-resolution.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [
        appConfig,
        authConfig,
        databaseConfig,
        redisConfig,
        throttleConfig,
      ],
      validationSchema: envValidationSchema,
    }),

    ClsModule.forRoot({
      global: true,
      middleware: {
        mount: true,
        generateId: true,
        idGenerator: () => crypto.randomUUID(),
      },
    }),

    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        throttlers: [
          {
            name: 'short',
            ttl: cfg.get<number>('throttle.short.ttl')!,
            limit: cfg.get<number>('throttle.short.limit')!,
          },
          {
            name: 'medium',
            ttl: cfg.get<number>('throttle.medium.ttl')!,
            limit: cfg.get<number>('throttle.medium.limit')!,
          },
          {
            name: 'long',
            ttl: cfg.get<number>('throttle.long.ttl')!,
            limit: cfg.get<number>('throttle.long.limit')!,
          },
        ],
      }),
    }),

    DatabaseModule,
    RedisModule,
    CoreModule,
    IamModule,
    PlatformAdminModule, // ← NEW

    // Uncomment as we build each:
    // ClinicCrmModule,
    // PetPortalModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(TenantResolutionMiddleware).forRoutes('*');
  }
}
