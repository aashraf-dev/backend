export enum UserType {
  // Platform level — no tenant association
  PLATFORM_SUPER_ADMIN = 'platform_super_admin',
  PLATFORM_SUPPORT = 'platform_support',

  // Tenant level — clinic staff
  CLINIC_OWNER = 'clinic_owner',
  CLINIC_MANAGER = 'clinic_manager',
  VETERINARIAN = 'veterinarian',
  VET_INTERN = 'vet_intern',
  RECEPTIONIST = 'receptionist',
  BILLING_STAFF = 'billing_staff',

  // Tenant level — client-facing
  PET_OWNER = 'pet_owner',
}

export const PLATFORM_USER_TYPES: UserType[] = [
  UserType.PLATFORM_SUPER_ADMIN,
  UserType.PLATFORM_SUPPORT,
];

export const CLINIC_STAFF_TYPES: UserType[] = [
  UserType.CLINIC_OWNER,
  UserType.CLINIC_MANAGER,
  UserType.VETERINARIAN,
  UserType.VET_INTERN,
  UserType.RECEPTIONIST,
  UserType.BILLING_STAFF,
];
