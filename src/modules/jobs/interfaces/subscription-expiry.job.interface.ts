export interface ISubscriptionExpiryJob {
  tenantId: string;
  tenantName: string;
  contactEmail: string;
  subscriptionPlan: string;
  expiresAt: string; // ISO string
  daysRemaining: number;
}
