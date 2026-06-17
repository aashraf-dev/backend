import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';

import {
  DATA_SOURCE_PLATFORM,
  DATA_SOURCE_TENANT,
} from 'src/shared/constants/data-source.constants';
import { TenantConnectionService } from './tenant-connection.service';
import { TenantRepositoryFactory } from './tenant-repository';

// ── Entity collections ────────────────────────────────────────────────
import {
  TenantEntity,
  PlatformUserEntity,
  PlatformSessionEntity,
  PlatformAuditLogEntity,
} from './entities/platform';

import {
  UserEntity,
  RoleEntity,
  PermissionEntity,
  RolePermissionEntity,
  UserRoleEntity,
  SessionEntity,
  MfaSettingEntity,
  DepartmentEntity,
  DesignationEntity,
  UserDepartmentEntity,
  DepartmentRoleEntity,
  DesignationRoleEntity,
  UserPermissionOverrideEntity,
  PetEntity,
  OwnerProfileEntity,
  MedicalRecordEntity,
  PrescriptionEntity,
  AppointmentEntity,
  ClinicServiceEntity,
  TenantAuditLogEntity,
} from './entities/tenant';

export const PLATFORM_ENTITIES = [
  TenantEntity,
  PlatformUserEntity,
  PlatformSessionEntity,
  PlatformAuditLogEntity,
];

// Replace the existing TENANT_ENTITIES array with:
export const TENANT_ENTITIES = [
  UserEntity,
  RoleEntity,
  PermissionEntity,
  RolePermissionEntity,
  UserRoleEntity,
  SessionEntity,
  MfaSettingEntity,
  DepartmentEntity, // NEW
  DesignationEntity, // NEW
  UserDepartmentEntity, // NEW
  DepartmentRoleEntity, // NEW
  DesignationRoleEntity, // NEW
  UserPermissionOverrideEntity, // NEW
  PetEntity,
  OwnerProfileEntity,
  MedicalRecordEntity,
  PrescriptionEntity,
  AppointmentEntity,
  ClinicServiceEntity,
  TenantAuditLogEntity,
];

@Module({
  imports: [
    // ── Platform DataSource — public schema ─────────────────────────
    TypeOrmModule.forRootAsync({
      name: DATA_SOURCE_PLATFORM,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        type: 'postgres',
        host: cfg.get<string>('database.host'),
        port: cfg.get<number>('database.port'),
        username: cfg.get<string>('database.username'),
        password: cfg.get<string>('database.password'),
        database: cfg.get<string>('database.name'),
        schema: 'public',
        entities: PLATFORM_ENTITIES,
        synchronize: cfg.get<string>('app.nodeEnv') !== 'production',
        logging: cfg.get<string>('app.nodeEnv') === 'development',
        pool: { min: 2, max: 10 },
        ssl:
          cfg.get<string>('app.nodeEnv') === 'production'
            ? { rejectUnauthorized: true }
            : { rejectUnauthorized: false },
        extra: {
          statement_timeout: 30000, // 30 s query timeout
          idle_in_transaction_session_timeout: 60000,
        },
      }),
    }),

    // ── Tenant DataSource — schema set per-request via search_path ──
    TypeOrmModule.forRootAsync({
      name: DATA_SOURCE_TENANT,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        type: 'postgres',
        host: cfg.get<string>('database.host'),
        port: cfg.get<number>('database.port'),
        username: cfg.get<string>('database.username'),
        password: cfg.get<string>('database.password'),
        database: cfg.get<string>('database.name'),
        entities: TENANT_ENTITIES,
        synchronize: false, // provisioned manually per-tenant
        logging: cfg.get<string>('app.nodeEnv') === 'development',
        pool: { min: 2, max: 20 },
        ssl:
          cfg.get<string>('app.nodeEnv') === 'production'
            ? { rejectUnauthorized: true }
            : { rejectUnauthorized: false },
        extra: {
          statement_timeout: 30000,
          idle_in_transaction_session_timeout: 60000,
        },
      }),
    }),
  ],
  providers: [TenantConnectionService, TenantRepositoryFactory],
  exports: [TenantConnectionService, TenantRepositoryFactory],
})
export class DatabaseModule {}
