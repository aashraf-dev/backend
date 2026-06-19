export interface IAppointmentReminderJob {
  appointmentId: string;
  tenantId: string;
  tenantSchema: string;
  tenantName: string;
  petName: string;
  ownerEmail: string;
  ownerFirstName: string;
  vetName: string;
  serviceName: string | null;
  scheduledAt: string; // ISO string
  durationMinutes: number;
  reminderHours: number; // Which reminder window triggered this (24h or 2h)
}
