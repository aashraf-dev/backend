import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../base.entity';
import { PetEntity } from './pet.entity';
import { UserEntity } from './user.entity';

export enum MedicalRecordType {
  CONSULTATION = 'consultation',
  VACCINATION = 'vaccination',
  SURGERY = 'surgery',
  LAB_RESULT = 'lab_result',
  IMAGING = 'imaging',
  DENTAL = 'dental',
  GROOMING = 'grooming',
  FOLLOW_UP = 'follow_up',
  OTHER = 'other',
}

@Entity({ name: 'medical_records' })
export class MedicalRecordEntity extends BaseEntity {
  @Index()
  @Column({ name: 'pet_id', type: 'uuid' })
  petId!: string;

  @ManyToOne(() => PetEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'pet_id' })
  pet!: PetEntity;

  @Index()
  @Column({ name: 'attending_vet_id', type: 'uuid' })
  attendingVetId!: string;

  @ManyToOne(() => UserEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'attending_vet_id' })
  attendingVet!: UserEntity;

  @Column({ name: 'record_type', type: 'enum', enum: MedicalRecordType })
  recordType!: MedicalRecordType;

  @Column({ name: 'visit_date', type: 'timestamptz' })
  visitDate!: Date;

  @Column({ name: 'chief_complaint', type: 'text', nullable: true })
  chiefComplaint!: string | null;

  @Column({ name: 'diagnosis', type: 'text', nullable: true })
  diagnosis!: string | null;

  @Column({ name: 'treatment', type: 'text', nullable: true })
  treatment!: string | null;

  @Column({ name: 'notes', type: 'text', nullable: true })
  notes!: string | null;

  @Column({
    name: 'weight_at_visit_kg',
    type: 'decimal',
    precision: 6,
    scale: 2,
    nullable: true,
  })
  weightAtVisitKg!: number | null;

  @Column({
    name: 'temperature_celsius',
    type: 'decimal',
    precision: 4,
    scale: 1,
    nullable: true,
  })
  temperatureCelsius!: number | null;

  /** JSON array of attachment URLs (X-rays, lab reports, etc.) */
  @Column({ name: 'attachments', type: 'jsonb', default: '[]' })
  attachments!: string[];

  @Column({ name: 'follow_up_date', type: 'date', nullable: true })
  followUpDate!: string | null;
}
