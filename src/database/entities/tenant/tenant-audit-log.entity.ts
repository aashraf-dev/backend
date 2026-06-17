import { Column, Entity, Index } from 'typeorm';
import { AppContext } from 'src/shared/enums/app-context.enum';

/** Per-tenant immutable audit trail */
@Entity({ name: 'audit_logs' })
export class TenantAuditLogEntity {
  @Column({ name: 'id', type: 'uuid', primary: true, generated: 'uuid' })
  id!: string;

  @Index()
  @Column({ name: 'actor_id', type: 'uuid', nullable: true })
  actorId!: string | null;

  @Column({ name: 'actor_email', type: 'varchar', length: 320, nullable: true })
  actorEmail!: string | null;

  @Column({ name: 'app_context', type: 'enum', enum: AppContext })
  appContext!: AppContext;

  @Column({ name: 'action', type: 'varchar', length: 120 })
  action!: string;

  @Column({
    name: 'resource_type',
    type: 'varchar',
    length: 80,
    nullable: true,
  })
  resourceType!: string | null;

  @Column({ name: 'resource_id', type: 'uuid', nullable: true })
  resourceId!: string | null;

  @Column({ name: 'old_value', type: 'jsonb', nullable: true })
  oldValue!: Record<string, unknown> | null;

  @Column({ name: 'new_value', type: 'jsonb', nullable: true })
  newValue!: Record<string, unknown> | null;

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
