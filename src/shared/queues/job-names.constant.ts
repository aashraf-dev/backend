export const JobName = {
  // ── Email jobs ────────────────────────────────────────────────────
  SEND_EMAIL: 'send-email',

  // ── Appointment jobs ──────────────────────────────────────────────
  APPOINTMENT_REMINDER: 'appointment-reminder',
  APPOINTMENT_FOLLOW_UP_FLAG: 'appointment-follow-up-flag',

  // ── Clinical jobs ─────────────────────────────────────────────────
  PRESCRIPTION_EXPIRY_CHECK: 'prescription-expiry-check',
  FOLLOW_UP_OVERDUE_CHECK: 'follow-up-overdue-check',

  // ── Maintenance jobs ──────────────────────────────────────────────
  SESSION_CLEANUP: 'session-cleanup',
  EXPIRED_RESET_TOKEN_CLEANUP: 'expired-reset-token-cleanup',
  AUDIT_LOG_ARCHIVE: 'audit-log-archive',
  SOFT_DELETE_PURGE: 'soft-delete-purge',

  // ── Subscription jobs ─────────────────────────────────────────────
  SUBSCRIPTION_EXPIRY_WARNING: 'subscription-expiry-warning',
  SUBSCRIPTION_EXPIRED_SUSPEND: 'subscription-expired-suspend',
} as const;

export type JobName = (typeof JobName)[keyof typeof JobName];
