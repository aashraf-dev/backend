import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { DesignationEntity } from './designation.entity';
import { RoleEntity } from './role.entity';

@Entity({ name: 'designation_roles' })
@Index(['designationId', 'roleId'], { unique: true })
export class DesignationRoleEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'designation_id', type: 'uuid' })
  designationId!: string;

  @ManyToOne(() => DesignationEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'designation_id' })
  designation!: DesignationEntity;

  @Column({ name: 'role_id', type: 'uuid' })
  roleId!: string;

  @ManyToOne(() => RoleEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'role_id' })
  role!: RoleEntity;

  @Column({ name: 'assigned_by', type: 'uuid', nullable: true })
  assignedBy!: string | null;

  @Column({ name: 'assigned_at', type: 'timestamptz', default: () => 'NOW()' })
  assignedAt!: Date;
}
