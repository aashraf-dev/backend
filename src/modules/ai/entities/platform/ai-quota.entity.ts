import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity({ name: 'ai_quotas', schema: 'public' })
@Index(['tenantId', 'periodStart'], { unique: true })
export class AiQuotaEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  /** Month start: first day of month at 00:00 UTC */
  @Column({ name: 'period_start', type: 'date' })
  periodStart!: string;

  @Column({
    name: 'monthly_limit_usd',
    type: 'decimal',
    precision: 8,
    scale: 2,
    default: 15,
  })
  monthlyLimitUsd!: number;

  @Column({
    name: 'consumed_usd',
    type: 'decimal',
    precision: 10,
    scale: 6,
    default: 0,
  })
  consumedUsd!: number;

  @Column({ name: 'is_exceeded', type: 'boolean', default: false })
  isExceeded!: boolean;

  @Column({ name: 'features_enabled', type: 'jsonb', default: '{}' })
  featuresEnabled!: Record<string, boolean>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
