import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../base.entity';

export enum PermissionContext {
  /** Guards a backend API route */
  API = 'api',
  /** Controls frontend UI visibility (buttons, tabs, sections) */
  UI = 'ui',
}

@Entity({ name: 'permissions' })
export class PermissionEntity extends BaseEntity {
  /**
   * Unique machine key — used in @RequirePermissions() and stored in JWTs.
   * Format: "{module}:{action}"
   * Examples: "appointments:create", "billing:manage", "ui:reports:export_btn"
   */
  @Index({ unique: true })
  @Column({ name: 'key', type: 'varchar', length: 120 })
  key!: string;

  /** Logical module grouping e.g. "appointments", "billing", "medical_records" */
  @Index()
  @Column({ name: 'module', type: 'varchar', length: 80 })
  module!: string;

  /** The action or feature within the module e.g. "create", "export", "export_btn" */
  @Column({ name: 'action', type: 'varchar', length: 80 })
  action!: string;

  /** Whether this permission guards an API call or a UI element */
  @Column({
    name: 'context',
    type: 'enum',
    enum: PermissionContext,
    default: PermissionContext.API,
  })
  context!: PermissionContext;

  /** Human-readable label for display in admin portal */
  @Column({ name: 'display_name', type: 'varchar', length: 150 })
  displayName!: string;

  @Column({ name: 'description', type: 'text', nullable: true })
  description!: string | null;

  /**
   * System permissions are seeded on tenant provisioning and
   * cannot be deleted via the admin portal.
   */
  @Column({ name: 'is_system', type: 'boolean', default: false })
  isSystem!: boolean;
}
