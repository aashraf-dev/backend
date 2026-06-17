import { Column, Entity, Index, ManyToOne, JoinColumn } from 'typeorm';
import { PlatformUserEntity } from './platfrom-user.entity';
import { TenantEntity } from './tenant.entity';
import { AppContext } from 'src/shared/enums/app-context.enum';

/** Immutable audit trail — no BaseEntity to prevent accidental soft-deletes */
@Entity({ name: 'platform_audit_logs', schema: 'public' })
export class PlatformAuditLogEntity {
  @Column({ name: 'id', type: 'uuid', primary: true, generated: 'uuid' })
  id!: string;

  @Index()
  @Column({ name: 'actor_id', type: 'uuid', nullable: true })
  actorId!: string | null;

  @ManyToOne(() => PlatformUserEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'actor_id' })
  actor!: PlatformUserEntity | null;

  @Index()
  @Column({ name: 'tenant_id', type: 'uuid', nullable: true })
  tenantId!: string | null;

  @ManyToOne(() => TenantEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: TenantEntity | null;

  @Column({ name: 'app_context', type: 'enum', enum: AppContext })
  appContext!: AppContext;

  @Column({ name: 'action', type: 'varchar', length: 120 })
  action!: string; // e.g. "tenant.created", "platform_user.login"

  @Column({
    name: 'resource_type',
    type: 'varchar',
    length: 80,
    nullable: true,
  })
  resourceType!: string | null;

  @Column({ name: 'resource_id', type: 'uuid', nullable: true })
  resourceId!: string | null;

  @Column({ name: 'metadata', type: 'jsonb', default: '{}' })
  metadata!: Record<string, unknown>;

  @Column({ name: 'ip_address', type: 'varchar', length: 45, nullable: true })
  ipAddress!: string | null;

  @Column({ name: 'user_agent', type: 'text', nullable: true })
  userAgent!: string | null;

  @Column({ name: 'request_id', type: 'varchar', length: 36, nullable: true })
  requestId!: string | null;

  @Index()
  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'NOW()' })
  createdAt!: Date;
}
