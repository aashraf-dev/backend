export type EmailTemplate =
  | 'appointment-reminder'
  | 'prescription-expiry'
  | 'subscription-expiry'
  | 'password-reset'
  | 'registration-welcome'
  | 'follow-up-overdue';

export interface IEmailDispatchJob {
  to: string;
  subject: string;
  template: EmailTemplate;
  context: Record<string, unknown>;
  /** Retry attempts for this specific email */
  attempt?: number;
}
