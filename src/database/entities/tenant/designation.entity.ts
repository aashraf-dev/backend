import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../base.entity';
import { DepartmentEntity } from './department.entity';

@Entity({ name: 'designations' })
export class DesignationEntity extends BaseEntity {
  @Index({ unique: true })
  @Column({ name: 'name', type: 'varchar', length: 150 })
  name!: string; // e.g. "Senior Veterinarian", "Head of Surgery"

  /**
   * Optional department scope.
   * Null = designation is clinic-wide (e.g. "Clinic Owner").
   * Non-null = designation is department-specific (e.g. "Head of Surgery" → Surgery dept).
   */
  @Index()
  @Column({ name: 'department_id', type: 'uuid', nullable: true })
  departmentId!: string | null;

  @ManyToOne(() => DepartmentEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'department_id' })
  department!: DepartmentEntity | null;

  @Column({ name: 'description', type: 'text', nullable: true })
  description!: string | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;
}
