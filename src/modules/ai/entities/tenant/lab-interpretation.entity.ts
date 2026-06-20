import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export type LabSeverity = 'normal' | 'mild' | 'moderate' | 'significant';

@Entity({ name: 'lab_interpretations' })
export class LabInterpretationEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'medical_record_id', type: 'uuid' })
  medicalRecordId!: string;

  @Column({ name: 'pet_id', type: 'uuid' })
  petId!: string;

  /** Structured abnormal findings */
  @Column({ name: 'abnormal_values', type: 'jsonb', default: '[]' })
  abnormalValues!: IAbnormalValue[];

  @Column({
    name: 'overall_severity',
    type: 'varchar',
    length: 20,
    default: 'normal',
  })
  overallSeverity!: LabSeverity;

  /** AI-generated plain-language explanation for pet owners */
  @Column({ name: 'plain_language_summary', type: 'text', nullable: true })
  plainLanguageSummary!: string | null;

  /** Clinical interpretation for veterinarians */
  @Column({ name: 'clinical_summary', type: 'text', nullable: true })
  clinicalSummary!: string | null;

  /** Recommended follow-up actions */
  @Column({ name: 'recommended_actions', type: 'jsonb', default: '[]' })
  recommendedActions!: string[];

  /** Vet must approve before showing to portal */
  @Column({ name: 'vet_approved', type: 'boolean', default: false })
  vetApproved!: boolean;

  @Column({ name: 'approved_by', type: 'uuid', nullable: true })
  approvedBy!: string | null;

  @Column({ name: 'portal_published', type: 'boolean', default: false })
  portalPublished!: boolean;

  @Column({
    name: 'confidence_score',
    type: 'decimal',
    precision: 4,
    scale: 3,
    nullable: true,
  })
  confidenceScore!: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}

export interface IAbnormalValue {
  parameter: string;
  value: string;
  unit: string;
  referenceRange: string;
  severity: LabSeverity;
  direction: 'high' | 'low';
  note: string;
}
