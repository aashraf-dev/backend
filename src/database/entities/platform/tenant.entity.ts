import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../base.entity';

export enum TenantStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  TERMINATED = 'terminated',
}

export enum SubscriptionPlan {
  TRIAL = 'trial',
  STARTER = 'starter',
  PROFESSIONAL = 'professional',
  ENTERPRISE = 'enterprise',
}

@Entity({ name: 'tenants', schema: 'public' })
export class TenantEntity extends BaseEntity {
  @Column({ name: 'name', type: 'varchar', length: 200 })
  name!: string;

  @Index({ unique: true })
  @Column({ name: 'slug', type: 'varchar', length: 100 })
  slug!: string;

  /** Postgres schema name — derived from slug, stored for fast lookup */
  @Index({ unique: true })
  @Column({ name: 'schema_name', type: 'varchar', length: 120 })
  schemaName!: string;

  @Column({
    name: 'status',
    type: 'enum',
    enum: TenantStatus,
    default: TenantStatus.PENDING,
  })
  status!: TenantStatus;

  @Column({
    name: 'subscription_plan',
    type: 'enum',
    enum: SubscriptionPlan,
    default: SubscriptionPlan.TRIAL,
  })
  subscriptionPlan!: SubscriptionPlan;

  @Column({
    name: 'subscription_expires_at',
    type: 'timestamptz',
    nullable: true,
  })
  subscriptionExpiresAt!: Date | null;

  @Column({ name: 'contact_email', type: 'varchar', length: 320 })
  contactEmail!: string;

  @Column({
    name: 'contact_phone',
    type: 'varchar',
    length: 30,
    nullable: true,
  })
  contactPhone!: string | null;

  @Column({ name: 'address', type: 'text', nullable: true })
  address!: string | null;

  @Column({ name: 'city', type: 'varchar', length: 100, nullable: true })
  city!: string | null;

  @Column({ name: 'country', type: 'varchar', length: 2, nullable: true })
  country!: string | null; // ISO 3166-1 alpha-2

  @Column({ name: 'timezone', type: 'varchar', length: 60, default: 'UTC' })
  timezone!: string;

  @Column({ name: 'locale', type: 'varchar', length: 10, default: 'en-US' })
  locale!: string;

  /** Arbitrary JSON for clinic-specific feature flags */
  @Column({ name: 'settings', type: 'jsonb', default: '{}' })
  settings!: Record<string, unknown>;

  @Column({
    name: 'schema_provisioned_at',
    type: 'timestamptz',
    nullable: true,
  })
  schemaProvisionedAt!: Date | null;

  @Column({ name: 'last_active_at', type: 'timestamptz', nullable: true })
  lastActiveAt!: Date | null;
}
