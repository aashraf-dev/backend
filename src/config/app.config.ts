import { registerAs } from '@nestjs/config';

export const appConfig = registerAs('app', () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '3000', 10),
  baseDomain: process.env.BASE_DOMAIN ?? 'vetos.com',
  corsOrigins: (process.env.CORS_ORIGINS ?? 'http://localhost:3000').split(','),
  isProduction: process.env.NODE_ENV === 'production',

  email: {
    host: process.env.SMTP_HOST ?? 'smtp.sendgrid.net',
    port: parseInt(process.env.SMTP_PORT ?? '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER ?? '',
    pass: process.env.SMTP_PASS ?? '',
    fromName: process.env.SMTP_FROM_NAME ?? 'Vetos Platform',
    fromEmail: process.env.SMTP_FROM_EMAIL ?? 'noreply@vetos.com',
  },

  jobs: {
    appointmentReminderHours: (process.env.APPOINTMENT_REMINDER_HOURS ?? '24,2')
      .split(',')
      .map((h) => parseInt(h.trim(), 10)),
    subscriptionExpiryWarningDays: (
      process.env.SUBSCRIPTION_EXPIRY_WARNING_DAYS ?? '30,14,7,3,1'
    )
      .split(',')
      .map((d) => parseInt(d.trim(), 10)),
  },
}));
