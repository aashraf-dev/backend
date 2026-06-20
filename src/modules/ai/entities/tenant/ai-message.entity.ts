import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export type MessageRole = 'user' | 'assistant' | 'system';
export type MessageIntent =
  | 'booking'
  | 'rescheduling'
  | 'cancellation'
  | 'emergency'
  | 'refill'
  | 'faq'
  | 'staff_transfer'
  | 'unknown';

@Entity({ name: 'ai_messages' })
@Index(['conversationId', 'createdAt'])
export class AiMessageEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'conversation_id', type: 'uuid' })
  conversationId!: string;

  @Column({ name: 'role', type: 'varchar', length: 20 })
  role!: MessageRole;

  @Column({ name: 'content', type: 'text' })
  content!: string;

  @Column({ name: 'intent', type: 'varchar', length: 60, nullable: true })
  intent!: MessageIntent | null;

  @Column({
    name: 'intent_confidence',
    type: 'decimal',
    precision: 4,
    scale: 3,
    nullable: true,
  })
  intentConfidence!: number | null;

  @Column({ name: 'emergency_detected', type: 'boolean', default: false })
  emergencyDetected!: boolean;

  @Column({ name: 'prompt_tokens', type: 'int', default: 0 })
  promptTokens!: number;

  @Column({ name: 'completion_tokens', type: 'int', default: 0 })
  completionTokens!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
