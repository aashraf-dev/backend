import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../base.entity';
import { PetEntity } from './pet.entity';
import { UserEntity } from './user.entity';
import { MedicalRecordEntity } from './medical-record.entity';

export enum PrescriptionStatus {
  ACTIVE = 'active',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
}

@Entity({ name: 'prescriptions' })
export class PrescriptionEntity extends BaseEntity {
  @Index()
  @Column({ name: 'pet_id', type: 'uuid' })
  petId!: string;

  @ManyToOne(() => PetEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'pet_id' })
  pet!: PetEntity;

  @Index()
  @Column({ name: 'prescribed_by_id', type: 'uuid' })
  prescribedById!: string;

  @ManyToOne(() => UserEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'prescribed_by_id' })
  prescribedBy!: UserEntity;

  @Column({ name: 'medical_record_id', type: 'uuid', nullable: true })
  medicalRecordId!: string | null;

  @ManyToOne(() => MedicalRecordEntity, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'medical_record_id' })
  medicalRecord!: MedicalRecordEntity | null;

  @Column({ name: 'medication_name', type: 'varchar', length: 200 })
  medicationName!: string;

  @Column({ name: 'dosage', type: 'varchar', length: 100 })
  dosage!: string;

  @Column({ name: 'frequency', type: 'varchar', length: 100 })
  frequency!: string;

  @Column({ name: 'duration_days', type: 'int', nullable: true })
  durationDays!: number | null;

  @Column({ name: 'instructions', type: 'text', nullable: true })
  instructions!: string | null;

  @Column({ name: 'start_date', type: 'date' })
  startDate!: string;

  @Column({ name: 'end_date', type: 'date', nullable: true })
  endDate!: string | null;

  @Column({
    name: 'status',
    type: 'enum',
    enum: PrescriptionStatus,
    default: PrescriptionStatus.ACTIVE,
  })
  status!: PrescriptionStatus;

  @Column({ name: 'refills_remaining', type: 'int', default: 0 })
  refillsRemaining!: number;
}
