import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../base.entity';
import { OwnerProfileEntity } from './owner-profile.entity';

export enum PetGender {
  MALE = 'male',
  FEMALE = 'female',
  UNKNOWN = 'unknown',
}

@Entity({ name: 'pets' })
export class PetEntity extends BaseEntity {
  @Index()
  @Column({ name: 'owner_id', type: 'uuid' })
  ownerId!: string;

  @ManyToOne(() => OwnerProfileEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'owner_id' })
  owner!: OwnerProfileEntity;

  @Column({ name: 'name', type: 'varchar', length: 100 })
  name!: string;

  @Column({ name: 'species', type: 'varchar', length: 60 })
  species!: string; // e.g. "canine", "feline", "avian"

  @Column({ name: 'breed', type: 'varchar', length: 100, nullable: true })
  breed!: string | null;

  @Column({ name: 'date_of_birth', type: 'date', nullable: true })
  dateOfBirth!: string | null;

  @Column({
    name: 'gender',
    type: 'enum',
    enum: PetGender,
    default: PetGender.UNKNOWN,
  })
  gender!: PetGender;

  @Column({ name: 'color', type: 'varchar', length: 100, nullable: true })
  color!: string | null;

  @Column({
    name: 'weight_kg',
    type: 'decimal',
    precision: 6,
    scale: 2,
    nullable: true,
  })
  weightKg!: number | null;

  @Column({ name: 'microchip_id', type: 'varchar', length: 50, nullable: true })
  microchipId!: string | null;

  @Column({ name: 'is_neutered', type: 'boolean', nullable: true })
  isNeutered!: boolean | null;

  @Column({ name: 'is_deceased', type: 'boolean', default: false })
  isDeceased!: boolean;

  @Column({ name: 'deceased_at', type: 'date', nullable: true })
  deceasedAt!: string | null;

  @Column({ name: 'profile_image_url', type: 'text', nullable: true })
  profileImageUrl!: string | null;

  @Column({ name: 'notes', type: 'text', nullable: true })
  notes!: string | null;
}
