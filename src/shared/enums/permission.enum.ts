/**
 * System permission keys — used in @RequirePermissions() decorators and
 * as seed data for the permissions table on tenant provisioning.
 *
 * These string values MUST match the `key` column in the permissions table.
 * New custom permissions added via the admin portal don't need to be listed
 * here — they're purely DB-driven. This enum exists solely for type-safe
 * use in decorators and seeds.
 */
export enum Permission {
  // ── Appointments ────────────────────────────────────────────────
  APPOINTMENT_CREATE = 'appointments:create',
  APPOINTMENT_READ = 'appointments:read',
  APPOINTMENT_UPDATE = 'appointments:update',
  APPOINTMENT_DELETE = 'appointments:delete',
  APPOINTMENT_MANAGE = 'appointments:manage',

  // ── Pets ────────────────────────────────────────────────────────
  PET_CREATE = 'pets:create',
  PET_READ = 'pets:read',
  PET_UPDATE = 'pets:update',
  PET_DELETE = 'pets:delete',

  // ── Medical Records ─────────────────────────────────────────────
  MEDICAL_RECORD_CREATE = 'medical_records:create',
  MEDICAL_RECORD_READ = 'medical_records:read',
  MEDICAL_RECORD_UPDATE = 'medical_records:update',
  MEDICAL_RECORD_DELETE = 'medical_records:delete',

  // ── Prescriptions ───────────────────────────────────────────────
  PRESCRIPTION_CREATE = 'prescriptions:create',
  PRESCRIPTION_READ = 'prescriptions:read',
  PRESCRIPTION_UPDATE = 'prescriptions:update',
  PRESCRIPTION_DELETE = 'prescriptions:delete',

  // ── Staff / Users ───────────────────────────────────────────────
  USER_CREATE = 'users:create',
  USER_READ = 'users:read',
  USER_UPDATE = 'users:update',
  USER_DELETE = 'users:delete',
  USER_MANAGE = 'users:manage',

  // ── Roles & Permissions ─────────────────────────────────────────
  ROLE_CREATE = 'roles:create',
  ROLE_READ = 'roles:read',
  ROLE_UPDATE = 'roles:update',
  ROLE_DELETE = 'roles:delete',

  // ── Departments & Designations ───────────────────────────────────
  DEPARTMENT_MANAGE = 'departments:manage',
  DESIGNATION_MANAGE = 'designations:manage',

  // ── Billing ──────────────────────────────────────────────────────
  BILLING_READ = 'billing:read',
  BILLING_MANAGE = 'billing:manage',

  // ── Reports ──────────────────────────────────────────────────────
  REPORT_VIEW = 'reports:view',
  REPORT_EXPORT = 'reports:export',

  // ── Settings ─────────────────────────────────────────────────────
  SETTINGS_READ = 'settings:read',
  SETTINGS_UPDATE = 'settings:update',

  // ── Audit Logs ───────────────────────────────────────────────────
  AUDIT_LOG_READ = 'audit_logs:read',

  // ── Tenant Management (platform admin only) ───────────────────────
  TENANT_CREATE = 'tenants:create',
  TENANT_READ = 'tenants:read',
  TENANT_UPDATE = 'tenants:update',
  TENANT_DELETE = 'tenants:delete',
  TENANT_MANAGE = 'tenants:manage',

  // ── Platform (super admin only) ───────────────────────────────────
  PLATFORM_MANAGE = 'platform:manage',

  // ── Pet Owner self-service ────────────────────────────────────────
  OWN_PETS_READ = 'portal:pets:read',
  OWN_APPOINTMENTS_READ = 'portal:appointments:read',
  OWN_APPOINTMENTS_CREATE = 'portal:appointments:create',
  OWN_MEDICAL_RECORDS_READ = 'portal:medical_records:read',
  OWN_PRESCRIPTIONS_READ = 'portal:prescriptions:read',

  // ── UI Feature Flags ─────────────────────────────────────────────
  UI_REPORTS_REVENUE_CHART = 'ui:reports:revenue_chart',
  UI_REPORTS_EXPORT_BTN = 'ui:reports:export_btn',
  UI_DASHBOARD_STAFF_METRICS = 'ui:dashboard:staff_metrics',
  UI_BILLING_INVOICES = 'ui:billing:invoices',
}
