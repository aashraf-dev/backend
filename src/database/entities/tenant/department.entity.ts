import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../base.entity';

@Entity({ name: 'departments' })
export class DepartmentEntity extends BaseEntity {
  @Index({ unique: true })
  @Column({ name: 'name', type: 'varchar', length: 150 })
  name!: string;

  @Column({ name: 'description', type: 'text', nullable: true })
  description!: string | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;
}
