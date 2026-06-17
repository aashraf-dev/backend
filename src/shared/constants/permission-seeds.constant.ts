import { Permission } from '../enums/permission.enum';
import { PermissionContext } from '../../database/entities/tenant/permission.entity';

/**
 * Seed definitions for the permissions table.
 * Applied on every new tenant schema provisioning.
 * Operators can add MORE permissions via the admin portal.
 */
export interface IPermissionSeed {
  key: string;
  module: string;
  action: string;
  context: PermissionContext;
  displayName: string;
  description: string;
  isSystem: true;
}

export const PERMISSION_SEEDS: IPermissionSeed[] = [
  // ── Appointments ──────────────────────────────────────────────────
  {
    key: Permission.APPOINTMENT_CREATE,
    module: 'appointments',
    action: 'create',
    context: PermissionContext.API,
    displayName: 'Create Appointment',
    description: 'Book new appointments',
    isSystem: true,
  },
  {
    key: Permission.APPOINTMENT_READ,
    module: 'appointments',
    action: 'read',
    context: PermissionContext.API,
    displayName: 'View Appointments',
    description: 'View appointment list and details',
    isSystem: true,
  },
  {
    key: Permission.APPOINTMENT_UPDATE,
    module: 'appointments',
    action: 'update',
    context: PermissionContext.API,
    displayName: 'Edit Appointment',
    description: 'Reschedule or update appointments',
    isSystem: true,
  },
  {
    key: Permission.APPOINTMENT_DELETE,
    module: 'appointments',
    action: 'delete',
    context: PermissionContext.API,
    displayName: 'Cancel Appointment',
    description: 'Cancel or delete appointments',
    isSystem: true,
  },
  {
    key: Permission.APPOINTMENT_MANAGE,
    module: 'appointments',
    action: 'manage',
    context: PermissionContext.API,
    displayName: 'Manage All Appointments',
    description: 'Full appointment management including reassignment',
    isSystem: true,
  },

  // ── Pets ──────────────────────────────────────────────────────────
  {
    key: Permission.PET_CREATE,
    module: 'pets',
    action: 'create',
    context: PermissionContext.API,
    displayName: 'Register Pet',
    description: 'Add new patients',
    isSystem: true,
  },
  {
    key: Permission.PET_READ,
    module: 'pets',
    action: 'read',
    context: PermissionContext.API,
    displayName: 'View Pets',
    description: 'View patient profiles',
    isSystem: true,
  },
  {
    key: Permission.PET_UPDATE,
    module: 'pets',
    action: 'update',
    context: PermissionContext.API,
    displayName: 'Edit Pet',
    description: 'Update patient details',
    isSystem: true,
  },
  {
    key: Permission.PET_DELETE,
    module: 'pets',
    action: 'delete',
    context: PermissionContext.API,
    displayName: 'Archive Pet',
    description: 'Archive patient records',
    isSystem: true,
  },

  // ── Medical Records ───────────────────────────────────────────────
  {
    key: Permission.MEDICAL_RECORD_CREATE,
    module: 'medical_records',
    action: 'create',
    context: PermissionContext.API,
    displayName: 'Create Medical Record',
    description: 'Add visit notes, diagnoses',
    isSystem: true,
  },
  {
    key: Permission.MEDICAL_RECORD_READ,
    module: 'medical_records',
    action: 'read',
    context: PermissionContext.API,
    displayName: 'View Medical Records',
    description: 'View patient history',
    isSystem: true,
  },
  {
    key: Permission.MEDICAL_RECORD_UPDATE,
    module: 'medical_records',
    action: 'update',
    context: PermissionContext.API,
    displayName: 'Edit Medical Record',
    description: 'Amend existing records',
    isSystem: true,
  },
  {
    key: Permission.MEDICAL_RECORD_DELETE,
    module: 'medical_records',
    action: 'delete',
    context: PermissionContext.API,
    displayName: 'Delete Medical Record',
    description: 'Soft-delete medical records',
    isSystem: true,
  },

  // ── Prescriptions ─────────────────────────────────────────────────
  {
    key: Permission.PRESCRIPTION_CREATE,
    module: 'prescriptions',
    action: 'create',
    context: PermissionContext.API,
    displayName: 'Issue Prescription',
    description: 'Write new prescriptions',
    isSystem: true,
  },
  {
    key: Permission.PRESCRIPTION_READ,
    module: 'prescriptions',
    action: 'read',
    context: PermissionContext.API,
    displayName: 'View Prescriptions',
    description: 'View prescription records',
    isSystem: true,
  },
  {
    key: Permission.PRESCRIPTION_UPDATE,
    module: 'prescriptions',
    action: 'update',
    context: PermissionContext.API,
    displayName: 'Edit Prescription',
    description: 'Modify active prescriptions',
    isSystem: true,
  },
  {
    key: Permission.PRESCRIPTION_DELETE,
    module: 'prescriptions',
    action: 'delete',
    context: PermissionContext.API,
    displayName: 'Revoke Prescription',
    description: 'Cancel prescriptions',
    isSystem: true,
  },

  // ── Users & Staff ─────────────────────────────────────────────────
  {
    key: Permission.USER_CREATE,
    module: 'users',
    action: 'create',
    context: PermissionContext.API,
    displayName: 'Add Staff Member',
    description: 'Invite new staff',
    isSystem: true,
  },
  {
    key: Permission.USER_READ,
    module: 'users',
    action: 'read',
    context: PermissionContext.API,
    displayName: 'View Staff',
    description: 'View staff directory',
    isSystem: true,
  },
  {
    key: Permission.USER_UPDATE,
    module: 'users',
    action: 'update',
    context: PermissionContext.API,
    displayName: 'Edit Staff Member',
    description: 'Update staff details',
    isSystem: true,
  },
  {
    key: Permission.USER_DELETE,
    module: 'users',
    action: 'delete',
    context: PermissionContext.API,
    displayName: 'Remove Staff Member',
    description: 'Deactivate staff accounts',
    isSystem: true,
  },
  {
    key: Permission.USER_MANAGE,
    module: 'users',
    action: 'manage',
    context: PermissionContext.API,
    displayName: 'Manage All Staff',
    description: 'Full staff management including roles',
    isSystem: true,
  },

  // ── Roles & Permissions ───────────────────────────────────────────
  {
    key: Permission.ROLE_CREATE,
    module: 'roles',
    action: 'create',
    context: PermissionContext.API,
    displayName: 'Create Role',
    description: 'Define new roles',
    isSystem: true,
  },
  {
    key: Permission.ROLE_READ,
    module: 'roles',
    action: 'read',
    context: PermissionContext.API,
    displayName: 'View Roles',
    description: 'View role definitions',
    isSystem: true,
  },
  {
    key: Permission.ROLE_UPDATE,
    module: 'roles',
    action: 'update',
    context: PermissionContext.API,
    displayName: 'Edit Role',
    description: 'Modify role permissions',
    isSystem: true,
  },
  {
    key: Permission.ROLE_DELETE,
    module: 'roles',
    action: 'delete',
    context: PermissionContext.API,
    displayName: 'Delete Role',
    description: 'Remove custom roles',
    isSystem: true,
  },

  // ── Departments & Designations ────────────────────────────────────
  {
    key: Permission.DEPARTMENT_MANAGE,
    module: 'departments',
    action: 'manage',
    context: PermissionContext.API,
    displayName: 'Manage Departments',
    description: 'Create and manage departments',
    isSystem: true,
  },
  {
    key: Permission.DESIGNATION_MANAGE,
    module: 'designations',
    action: 'manage',
    context: PermissionContext.API,
    displayName: 'Manage Designations',
    description: 'Create and manage designations',
    isSystem: true,
  },

  // ── Billing ───────────────────────────────────────────────────────
  {
    key: Permission.BILLING_READ,
    module: 'billing',
    action: 'read',
    context: PermissionContext.API,
    displayName: 'View Billing',
    description: 'View invoices and payments',
    isSystem: true,
  },
  {
    key: Permission.BILLING_MANAGE,
    module: 'billing',
    action: 'manage',
    context: PermissionContext.API,
    displayName: 'Manage Billing',
    description: 'Create/edit invoices and process payments',
    isSystem: true,
  },

  // ── Reports ───────────────────────────────────────────────────────
  {
    key: Permission.REPORT_VIEW,
    module: 'reports',
    action: 'view',
    context: PermissionContext.API,
    displayName: 'View Reports',
    description: 'Access clinic reports',
    isSystem: true,
  },
  {
    key: Permission.REPORT_EXPORT,
    module: 'reports',
    action: 'export',
    context: PermissionContext.API,
    displayName: 'Export Reports',
    description: 'Download report data',
    isSystem: true,
  },

  // ── Settings ──────────────────────────────────────────────────────
  {
    key: Permission.SETTINGS_READ,
    module: 'settings',
    action: 'read',
    context: PermissionContext.API,
    displayName: 'View Settings',
    description: 'View clinic configuration',
    isSystem: true,
  },
  {
    key: Permission.SETTINGS_UPDATE,
    module: 'settings',
    action: 'update',
    context: PermissionContext.API,
    displayName: 'Update Settings',
    description: 'Modify clinic configuration',
    isSystem: true,
  },

  // ── Audit Logs ────────────────────────────────────────────────────
  {
    key: Permission.AUDIT_LOG_READ,
    module: 'audit_logs',
    action: 'read',
    context: PermissionContext.API,
    displayName: 'View Audit Logs',
    description: 'Access the audit trail',
    isSystem: true,
  },

  // ── Platform ──────────────────────────────────────────────────────
  {
    key: Permission.TENANT_CREATE,
    module: 'tenants',
    action: 'create',
    context: PermissionContext.API,
    displayName: 'Create Tenant',
    description: 'Onboard a new clinic',
    isSystem: true,
  },
  {
    key: Permission.TENANT_READ,
    module: 'tenants',
    action: 'read',
    context: PermissionContext.API,
    displayName: 'View Tenants',
    description: 'View clinic list and details',
    isSystem: true,
  },
  {
    key: Permission.TENANT_UPDATE,
    module: 'tenants',
    action: 'update',
    context: PermissionContext.API,
    displayName: 'Edit Tenant',
    description: 'Update clinic configuration',
    isSystem: true,
  },
  {
    key: Permission.TENANT_DELETE,
    module: 'tenants',
    action: 'delete',
    context: PermissionContext.API,
    displayName: 'Delete Tenant',
    description: 'Terminate a clinic account',
    isSystem: true,
  },
  {
    key: Permission.TENANT_MANAGE,
    module: 'tenants',
    action: 'manage',
    context: PermissionContext.API,
    displayName: 'Manage Tenants',
    description: 'Full tenant management',
    isSystem: true,
  },
  {
    key: Permission.PLATFORM_MANAGE,
    module: 'platform',
    action: 'manage',
    context: PermissionContext.API,
    displayName: 'Platform Administration',
    description: 'Super admin platform controls',
    isSystem: true,
  },

  // ── Pet Owner Portal ──────────────────────────────────────────────
  {
    key: Permission.OWN_PETS_READ,
    module: 'portal',
    action: 'pets:read',
    context: PermissionContext.API,
    displayName: 'View Own Pets',
    description: 'Pet owner views their own pets',
    isSystem: true,
  },
  {
    key: Permission.OWN_APPOINTMENTS_READ,
    module: 'portal',
    action: 'appointments:read',
    context: PermissionContext.API,
    displayName: 'View Own Appointments',
    description: 'Pet owner views their appointments',
    isSystem: true,
  },
  {
    key: Permission.OWN_APPOINTMENTS_CREATE,
    module: 'portal',
    action: 'appointments:create',
    context: PermissionContext.API,
    displayName: 'Book Appointment',
    description: 'Pet owner books an appointment',
    isSystem: true,
  },
  {
    key: Permission.OWN_MEDICAL_RECORDS_READ,
    module: 'portal',
    action: 'medical_records:read',
    context: PermissionContext.API,
    displayName: 'View Own Medical Records',
    description: 'Pet owner views pet health history',
    isSystem: true,
  },
  {
    key: Permission.OWN_PRESCRIPTIONS_READ,
    module: 'portal',
    action: 'prescriptions:read',
    context: PermissionContext.API,
    displayName: 'View Own Prescriptions',
    description: 'Pet owner views active prescriptions',
    isSystem: true,
  },

  // ── UI Feature Flags ──────────────────────────────────────────────
  {
    key: Permission.UI_REPORTS_REVENUE_CHART,
    module: 'ui',
    action: 'reports:revenue_chart',
    context: PermissionContext.UI,
    displayName: 'Revenue Chart Widget',
    description: 'Show revenue chart on dashboard',
    isSystem: true,
  },
  {
    key: Permission.UI_REPORTS_EXPORT_BTN,
    module: 'ui',
    action: 'reports:export_btn',
    context: PermissionContext.UI,
    displayName: 'Export Button on Reports',
    description: 'Show export button on reports page',
    isSystem: true,
  },
  {
    key: Permission.UI_DASHBOARD_STAFF_METRICS,
    module: 'ui',
    action: 'dashboard:staff_metrics',
    context: PermissionContext.UI,
    displayName: 'Staff Metrics on Dashboard',
    description: 'Show staff performance metrics',
    isSystem: true,
  },
  {
    key: Permission.UI_BILLING_INVOICES,
    module: 'ui',
    action: 'billing:invoices',
    context: PermissionContext.UI,
    displayName: 'Billing Invoice Panel',
    description: 'Show billing invoices section',
    isSystem: true,
  },
];

/**
 * Default role → permission key mappings.
 * Used during tenant schema provisioning to pre-assign permissions to system roles.
 * Does NOT hardcode these in the guard — DB is always the source of truth.
 */
export const DEFAULT_ROLE_PERMISSION_KEYS: Record<string, string[]> = {
  clinic_owner: PERMISSION_SEEDS.filter(
    (p) => p.key !== Permission.PLATFORM_MANAGE,
  ).map((p) => p.key),

  clinic_manager: [
    Permission.APPOINTMENT_MANAGE,
    Permission.PET_READ,
    Permission.PET_UPDATE,
    Permission.MEDICAL_RECORD_READ,
    Permission.PRESCRIPTION_READ,
    Permission.USER_MANAGE,
    Permission.ROLE_READ,
    Permission.DEPARTMENT_MANAGE,
    Permission.DESIGNATION_MANAGE,
    Permission.BILLING_MANAGE,
    Permission.REPORT_VIEW,
    Permission.REPORT_EXPORT,
    Permission.SETTINGS_READ,
    Permission.SETTINGS_UPDATE,
    Permission.AUDIT_LOG_READ,
    Permission.UI_REPORTS_REVENUE_CHART,
    Permission.UI_REPORTS_EXPORT_BTN,
    Permission.UI_DASHBOARD_STAFF_METRICS,
    Permission.UI_BILLING_INVOICES,
  ],

  veterinarian: [
    Permission.APPOINTMENT_CREATE,
    Permission.APPOINTMENT_READ,
    Permission.APPOINTMENT_UPDATE,
    Permission.PET_CREATE,
    Permission.PET_READ,
    Permission.PET_UPDATE,
    Permission.MEDICAL_RECORD_CREATE,
    Permission.MEDICAL_RECORD_READ,
    Permission.MEDICAL_RECORD_UPDATE,
    Permission.PRESCRIPTION_CREATE,
    Permission.PRESCRIPTION_READ,
    Permission.PRESCRIPTION_UPDATE,
    Permission.REPORT_VIEW,
    Permission.UI_REPORTS_REVENUE_CHART,
  ],

  vet_intern: [
    Permission.APPOINTMENT_READ,
    Permission.PET_READ,
    Permission.MEDICAL_RECORD_READ,
    Permission.PRESCRIPTION_READ,
  ],

  receptionist: [
    Permission.APPOINTMENT_CREATE,
    Permission.APPOINTMENT_READ,
    Permission.APPOINTMENT_UPDATE,
    Permission.PET_CREATE,
    Permission.PET_READ,
    Permission.USER_READ,
  ],

  billing_staff: [
    Permission.BILLING_MANAGE,
    Permission.APPOINTMENT_READ,
    Permission.REPORT_VIEW,
    Permission.REPORT_EXPORT,
    Permission.UI_REPORTS_EXPORT_BTN,
    Permission.UI_BILLING_INVOICES,
  ],

  pet_owner: [
    Permission.OWN_PETS_READ,
    Permission.OWN_APPOINTMENTS_READ,
    Permission.OWN_APPOINTMENTS_CREATE,
    Permission.OWN_MEDICAL_RECORDS_READ,
    Permission.OWN_PRESCRIPTIONS_READ,
  ],
};
