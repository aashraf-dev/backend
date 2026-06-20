import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export type ConversationSurface = 'crm' | 'portal' | 'voice';
export type ConversationStatus = 'active' | 'closed' | 'escalated';

@Entity({ name: 'ai_conversations' })
export class AiConversationEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId!: string | null;

  @Column({ name: 'surface', type: 'varchar', length: 20 })
  surface!: ConversationSurface;

  @Column({ name: 'status', type: 'varchar', length: 20, default: 'active' })
  status!: ConversationStatus;

  /** Last detected intent */
  @Column({ name: 'last_intent', type: 'varchar', length: 60, nullable: true })
  lastIntent!: string | null;

  /** True if emergency was detected at any point */
  @Column({ name: 'emergency_flagged', type: 'boolean', default: false })
  emergencyFlagged!: boolean;

  /** Linked appointment if booking intent was completed */
  @Column({ name: 'linked_appointment_id', type: 'uuid', nullable: true })
  linkedAppointmentId!: string | null;

  @Column({ name: 'metadata', type: 'jsonb', default: '{}' })
  metadata!: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
