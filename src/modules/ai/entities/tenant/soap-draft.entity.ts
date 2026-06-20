import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export type SoapStatus = 'draft' | 'approved' | 'rejected';
export type SoapInput = 'text' | 'audio' | 'video';

@Entity({ name: 'soap_drafts' })
export class SoapDraftEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'pet_id', type: 'uuid' })
  petId!: string;

  @Column({ name: 'appointment_id', type: 'uuid', nullable: true })
  appointmentId!: string | null;

  @Column({ name: 'veterinarian_id', type: 'uuid' })
  veterinarianId!: string;

  @Column({ name: 'input_type', type: 'varchar', length: 20 })
  inputType!: SoapInput;

  /** Raw transcript text (from audio/video) or vet's typed notes */
  @Column({ name: 'raw_input', type: 'text', nullable: true })
  rawInput!: string | null;

  /** Azure Blob URL for audio/video file */
  @Column({ name: 'media_url', type: 'text', nullable: true })
  mediaUrl!: string | null;

  /** Deepgram transcript with diarization */
  @Column({ name: 'transcript', type: 'text', nullable: true })
  transcript!: string | null;

  /** AI-generated SOAP JSON */
  @Column({ name: 'soap_json', type: 'jsonb', nullable: true })
  soapJson!: ISoapJson | null;

  /** Plain-language client summary */
  @Column({ name: 'client_summary', type: 'jsonb', nullable: true })
  clientSummary!: IClientSummary | null;

  /** Sections where AI expressed low confidence */
  @Column({ name: 'uncertain_sections', type: 'jsonb', default: '[]' })
  uncertainSections!: string[];

  @Column({
    name: 'overall_confidence',
    type: 'decimal',
    precision: 4,
    scale: 3,
    nullable: true,
  })
  overallConfidence!: number | null;

  @Column({ name: 'status', type: 'varchar', length: 20, default: 'draft' })
  status!: SoapStatus;

  @Column({ name: 'approved_by', type: 'uuid', nullable: true })
  approvedBy!: string | null;

  @Column({ name: 'approved_at', type: 'timestamptz', nullable: true })
  approvedAt!: Date | null;

  @Column({ name: 'rejection_reason', type: 'text', nullable: true })
  rejectionReason!: string | null;

  /** Whether vet edited the draft before approving */
  @Column({ name: 'was_edited', type: 'boolean', default: false })
  wasEdited!: boolean;

  /** Whether client summary has been published to portal */
  @Column({ name: 'portal_published', type: 'boolean', default: false })
  portalPublished!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}

export interface ISoapJson {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
}

export interface IClientSummary {
  whatHappenedToday: string;
  whatWeFound: string;
  carePlan: string;
  nextSteps: string;
}
