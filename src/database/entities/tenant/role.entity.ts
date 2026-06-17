import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../base.entity';

@Entity({ name: 'roles' })
export class RoleEntity extends BaseEntity {
  @Index({ unique: true })
  @Column({ name: 'name', type: 'varchar', length: 80 })
  name!: string; // e.g. "veterinarian", "receptionist"

  @Column({ name: 'display_name', type: 'varchar', length: 120 })
  displayName!: string;

  @Column({ name: 'description', type: 'text', nullable: true })
  description!: string | null;

  /** System roles cannot be deleted by clinic admins */
  @Column({ name: 'is_system', type: 'boolean', default: false })
  isSystem!: boolean;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;
}
