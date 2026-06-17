import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../base.entity';
import { UserEntity } from './user.entity';
import { AppContext } from 'src/shared/enums/app-context.enum';

@Entity({ name: 'sessions' })
export class SessionEntity extends BaseEntity {
  @Index()
  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity;

  /** SHA-256 hash — indexed for fast lookup during token refresh */
  @Index()
  @Column({
    name: 'refresh_token_hash',
    type: 'varchar',
    length: 255,
    select: false,
  })
  refreshTokenHash!: string;

  @Column({ name: 'app_context', type: 'enum', enum: AppContext })
  appContext!: AppContext;

  @Column({ name: 'user_agent', type: 'text', nullable: true })
  userAgent!: string | null;

  @Column({ name: 'ip_address', type: 'varchar', length: 45 })
  ipAddress!: string;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt!: Date;

  @Column({ name: 'revoked_at', type: 'timestamptz', nullable: true })
  revokedAt!: Date | null;

  get isValid(): boolean {
    return this.revokedAt === null && this.expiresAt > new Date();
  }
}
