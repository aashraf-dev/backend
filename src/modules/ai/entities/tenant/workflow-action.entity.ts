import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export type WorkflowTrigger =
  | 'appointment_no_show'
  | 'lab_result_abnormal'
  | 'visit_completed'
  | 'prescription_expiring'
  | 'follow_up_overdue'
  | 'appointment_confirmed';

export type WorkflowActionType =
  | 'send_email'
  | 'send_sms'
  | 'create_task'
  | 'generate_call_script'
  | 'flag_for_review';

export type WorkflowActionStatus =
  | 'pending'
  | 'executed'
  | 'skipped'
  | 'overridden';

@Entity({ name: 'workflow_actions' })
export class WorkflowActionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'trigger', type: 'varchar', length: 60 })
  trigger!: WorkflowTrigger;

  @Column({ name: 'action_type', type: 'varchar', length: 60 })
  actionType!: WorkflowActionType;

  @Column({
    name: 'resource_type',
    type: 'varchar',
    length: 60,
    nullable: true,
  })
  resourceType!: string | null;

  @Column({ name: 'resource_id', type: 'uuid', nullable: true })
  resourceId!: string | null;

  @Column({ name: 'ai_generated_content', type: 'text', nullable: true })
  aiGeneratedContent!: string | null;

  @Column({ name: 'status', type: 'varchar', length: 20, default: 'pending' })
  status!: WorkflowActionStatus;

  @Column({ name: 'executed_at', type: 'timestamptz', nullable: true })
  executedAt!: Date | null;

  @Column({ name: 'overridden_by', type: 'uuid', nullable: true })
  overriddenBy!: string | null;

  @Column({ name: 'override_reason', type: 'text', nullable: true })
  overrideReason!: string | null;

  @Column({ name: 'metadata', type: 'jsonb', default: '{}' })
  metadata!: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
