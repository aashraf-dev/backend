/** All TTL values in seconds */
export const CacheTTL = {
  SESSION: 15 * 60,
  REFRESH_TOKEN: 7 * 24 * 60 * 60,
  TENANT: 60 * 60,
  MFA_ATTEMPTS: 15 * 60,
  PASSWORD_RESET: 30 * 60,
  CURRENT_USER: 5 * 60, // 5 min — profile data changes rarely
  USER_PERMISSIONS: 5 * 60,
  ROLE_PERMISSIONS: 15 * 60,
  DEPARTMENT_ROLES: 15 * 60,
  DESIGNATION_ROLES: 15 * 60,
  DEPARTMENT_MEMBERS: 10 * 60,
  DESIGNATION_HOLDERS: 10 * 60,
} as const;
