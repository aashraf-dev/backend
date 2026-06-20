import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

export type InsightCategory =
  | 'no_show_risk'
  | 'revenue_opportunity'
  | 'churn_risk'
  | 'workload_balance'
  | 'appointment_trend'
  | 'patient_health_alert';

export type InsightSeverity = 'info' | 'warning' | 'critical';

@Entity({ name: 'ai_insights' })
export class AiInsightEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'category', type: 'varchar', length: 60 })
  category!: InsightCategory;

  @Column({ name: 'severity', type: 'varchar', length: 20, default: 'info' })
  severity!: InsightSeverity;

  @Column({ name: 'title', type: 'varchar', length: 300 })
  title!: string;

  @Column({ name: 'explanation', type: 'text' })
  explanation!: string;

  /** Specific data points supporting this insight */
  @Column({ name: 'supporting_data', type: 'jsonb', default: '{}' })
  supportingData!: Record<string, unknown>;

  /** Concrete action the clinic should take */
  @Column({ name: 'recommended_action', type: 'text', nullable: true })
  recommendedAction!: string | null;

  /** Confidence score 0–1 */
  @Column({
    name: 'confidence',
    type: 'decimal',
    precision: 4,
    scale: 3,
    default: 0,
  })
  confidence!: number;

  @Column({ name: 'is_read', type: 'boolean', default: false })
  isRead!: boolean;

  @Column({ name: 'is_dismissed', type: 'boolean', default: false })
  isDismissed!: boolean;

  @Column({ name: 'generated_for_date', type: 'date' })
  generatedForDate!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
