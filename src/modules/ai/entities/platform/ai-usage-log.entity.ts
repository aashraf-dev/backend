import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity({ name: 'ai_usage_logs', schema: 'public' })
@Index(['tenantId', 'createdAt'])
export class AiUsageLogEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId!: string | null;

  /** Which AI feature triggered this usage */
  @Column({ name: 'feature', type: 'varchar', length: 60 })
  feature!: string;

  @Column({ name: 'model', type: 'varchar', length: 60, default: 'gpt-4o' })
  model!: string;

  @Column({ name: 'prompt_tokens', type: 'int', default: 0 })
  promptTokens!: number;

  @Column({ name: 'completion_tokens', type: 'int', default: 0 })
  completionTokens!: number;

  @Column({ name: 'total_tokens', type: 'int', default: 0 })
  totalTokens!: number;

  /** Calculated USD cost */
  @Column({
    name: 'cost_usd',
    type: 'decimal',
    precision: 10,
    scale: 6,
    default: 0,
  })
  costUsd!: number;

  @Column({ name: 'duration_ms', type: 'int', nullable: true })
  durationMs!: number | null;

  /** Whether this request was served from cache */
  @Column({ name: 'cache_hit', type: 'boolean', default: false })
  cacheHit!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
