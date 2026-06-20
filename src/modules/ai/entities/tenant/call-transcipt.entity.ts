import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

export type CallOutcome =
  | 'appointment_booked'
  | 'appointment_rescheduled'
  | 'appointment_cancelled'
  | 'question_answered'
  | 'refill_requested'
  | 'emergency_escalated'
  | 'staff_transfer'
  | 'abandoned';

@Entity({ name: 'call_transcripts' })
export class CallTranscriptEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    name: 'twilio_call_sid',
    type: 'varchar',
    length: 60,
    unique: true,
  })
  twilioCallSid!: string;

  @Column({ name: 'caller_phone', type: 'varchar', length: 30 })
  callerPhone!: string;

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId!: string | null;

  @Column({ name: 'duration_seconds', type: 'int', default: 0 })
  durationSeconds!: number;

  @Column({ name: 'transcript', type: 'text', nullable: true })
  transcript!: string | null;

  @Column({ name: 'intent', type: 'varchar', length: 60, nullable: true })
  intent!: string | null;

  @Column({ name: 'outcome', type: 'varchar', length: 60, nullable: true })
  outcome!: CallOutcome | null;

  @Column({ name: 'linked_appointment_id', type: 'uuid', nullable: true })
  linkedAppointmentId!: string | null;

  @Column({ name: 'emergency_flagged', type: 'boolean', default: false })
  emergencyFlagged!: boolean;

  @Column({ name: 'ai_booked', type: 'boolean', default: false })
  aiBooked!: boolean;

  @Column({ name: 'transferred_to_staff', type: 'boolean', default: false })
  transferredToStaff!: boolean;

  @Column({ name: 'conversation_turns', type: 'jsonb', default: '[]' })
  conversationTurns!: ICallTurn[];

  @Column({ name: 'metadata', type: 'jsonb', default: '{}' })
  metadata!: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}

export interface ICallTurn {
  speaker: 'caller' | 'ai';
  text: string;
  timestamp: string;
  intent?: string;
}
