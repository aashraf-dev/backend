import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { UserEntity } from './user.entity';
import { PermissionEntity } from './permission.entity';

export enum OverrideType {
  /** Explicitly grant — adds the permission even if no role provides it */
  GRANT = 'grant',
  /** Explicitly deny — removes the permission even if a role provides it */
  DENY = 'deny',
}

@Entity({ name: 'user_permission_overrides' })
@Index(['userId', 'permissionId'], { unique: true })
export class UserPermissionOverrideEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity;

  @Column({ name: 'permission_id', type: 'uuid' })
  permissionId!: string;

  @ManyToOne(() => PermissionEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'permission_id' })
  permission!: PermissionEntity;

  @Column({ name: 'type', type: 'enum', enum: OverrideType })
  type!: OverrideType;

  /** Why was this override applied — required for audit trail */
  @Column({ name: 'reason', type: 'text', nullable: true })
  reason!: string | null;

  /** Optional expiry — grant access until a date, then auto-revoke */
  @Column({ name: 'expires_at', type: 'timestamptz', nullable: true })
  expiresAt!: Date | null;

  @Column({ name: 'granted_by', type: 'uuid' })
  grantedBy!: string;

  @Column({ name: 'granted_at', type: 'timestamptz', default: () => 'NOW()' })
  grantedAt!: Date;
}
