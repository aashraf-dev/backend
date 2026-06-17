import {
  Injectable,
  InternalServerErrorException,
  Logger,
  OnModuleDestroy,
} from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import {
  DATA_SOURCE_PLATFORM,
  DATA_SOURCE_TENANT,
} from 'src/shared/constants/data-source.constants';
import { TENANT_ENTITIES } from './database.module';
import { ConfigService } from '@nestjs/config';

/** Regex guards against schema name injection */
const SAFE_SCHEMA_NAME = /^tenant_[a-z][a-z0-9_]{0,58}$/;

@Injectable()
export class TenantConnectionService implements OnModuleDestroy {
  private readonly logger = new Logger(TenantConnectionService.name);

  constructor(
    @InjectDataSource(DATA_SOURCE_PLATFORM)
    public readonly platformDataSource: DataSource,

    @InjectDataSource(DATA_SOURCE_TENANT)
    public readonly tenantDataSource: DataSource,

    private readonly configService: ConfigService,
  ) {}

  /**
   * Execute a callback within a tenant's schema context.
   *
   * Uses `SET LOCAL search_path` inside an explicit transaction so the
   * schema scope is absolutely bounded to this operation and cannot
   * leak to other requests sharing the same connection pool connection.
   */
  async runInTenantSchema<T>(
    schema: string,
    work: (manager: EntityManager) => Promise<T>,
  ): Promise<T> {
    this.assertSafeSchemaName(schema);

    const queryRunner = this.tenantDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      await queryRunner.query(`SET LOCAL search_path TO "${schema}"`);
      const result = await work(queryRunner.manager);
      await queryRunner.commitTransaction();
      return result;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Provision a brand-new schema for an onboarded tenant.
   * Creates the schema and synchronises all tenant entity tables into it.
   */
  async provisionTenantSchema(schema: string): Promise<void> {
    this.assertSafeSchemaName(schema);

    // 1. Create the Postgres schema
    const platformRunner = this.platformDataSource.createQueryRunner();
    await platformRunner.connect();
    try {
      await platformRunner.query(`CREATE SCHEMA IF NOT EXISTS "${schema}"`);
      this.logger.log(`Schema "${schema}" created`);
    } finally {
      await platformRunner.release();
    }

    // 2. Synchronise entity tables into the new schema via a temp DataSource
    const tempDataSource = new DataSource({
      type: 'postgres',
      host: this.configService.get<string>('database.host'),
      port: this.configService.get<number>('database.port'),
      username: this.configService.get<string>('database.username'),
      password: this.configService.get<string>('database.password'),
      database: this.configService.get<string>('database.name'),
      schema, // TypeORM targets this schema for CREATE TABLE
      entities: TENANT_ENTITIES,
      synchronize: true, // only on provisioning, not in runtime DS
      logging: false,
    });

    await tempDataSource.initialize();
    await tempDataSource.synchronize();
    await tempDataSource.destroy();

    this.logger.log(`Schema "${schema}" provisioned with all tenant tables`);
  }

  /**
   * Tear down a tenant schema (use with extreme caution — data loss).
   * Should only be called after confirming tenant termination policy.
   */
  async deprovisionTenantSchema(schema: string): Promise<void> {
    this.assertSafeSchemaName(schema);

    const qr = this.platformDataSource.createQueryRunner();
    await qr.connect();
    try {
      await qr.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
      this.logger.warn(`Schema "${schema}" dropped`);
    } finally {
      await qr.release();
    }
  }

  async onModuleDestroy(): Promise<void> {
    // DataSources managed by NestJS TypeORM module — no manual cleanup needed
  }

  // ── Private ─────────────────────────────────────────────────────────

  private assertSafeSchemaName(schema: string): void {
    if (!SAFE_SCHEMA_NAME.test(schema)) {
      this.logger.error(`Rejected unsafe schema name: "${schema}"`);
      throw new InternalServerErrorException(
        'Invalid tenant schema identifier',
      );
    }
  }
}
