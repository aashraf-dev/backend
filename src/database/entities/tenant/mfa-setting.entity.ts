import { Column, Entity, Index, JoinColumn, OneToOne } from 'typeorm';
import { BaseEntity } from '../../base.entity';
import { UserEntity } from './user.entity';

@Entity({ name: 'mfa_settings' })
export class MfaSettingEntity extends BaseEntity {
  @Index({ unique: true })
  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @OneToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity;

  @Column({ name: 'secret', type: 'varchar', length: 255, select: false })
  secret!: string;

  @Column({ name: 'is_verified', type: 'boolean', default: false })
  isVerified!: boolean;

  /** One-time recovery codes (hashed) */
  @Column({
    name: 'recovery_codes',
    type: 'jsonb',
    default: '[]',
    select: false,
  })
  recoveryCodes!: string[];

  @Column({ name: 'verified_at', type: 'timestamptz', nullable: true })
  verifiedAt!: Date | null;
}
