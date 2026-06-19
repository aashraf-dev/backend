/**
 * All BullMQ queue names in one place.
 * Changing a name here changes it everywhere — avoids string drift.
 */
export const QueueName = {
  /** Transactional emails — appointment confirmations, reminders, etc. */
  EMAIL_DISPATCH: 'email-dispatch',

  /** Appointment-related jobs — reminders, follow-up nudges */
  APPOINTMENTS: 'appointments',

  /** Clinical data jobs — prescription expiry, follow-up flags */
  CLINICAL: 'clinical',

  /** Platform maintenance — session cleanup, audit pruning, etc. */
  MAINTENANCE: 'maintenance',

  /** Subscription / billing lifecycle events */
  SUBSCRIPTIONS: 'subscriptions',
} as const;

export type QueueName = (typeof QueueName)[keyof typeof QueueName];
