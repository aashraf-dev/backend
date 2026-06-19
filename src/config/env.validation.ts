import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test', 'staging')
    .default('development'),
  PORT: Joi.number().port().default(3000),
  BASE_DOMAIN: Joi.string().hostname().default('vetos.com'),
  CORS_ORIGINS: Joi.string().required(),

  // Database
  DB_HOST: Joi.string().required(),
  DB_PORT: Joi.number().port().default(5432),
  DB_USERNAME: Joi.string().required(),
  DB_PASSWORD: Joi.string().required(),
  DB_NAME: Joi.string().required(),

  // JWT
  JWT_ACCESS_SECRET: Joi.string().min(64).required(),
  JWT_REFRESH_SECRET: Joi.string().min(64).required(),
  JWT_ACCESS_EXPIRY: Joi.string().default('15m'),
  JWT_REFRESH_EXPIRY: Joi.string().default('7d'),

  // Redis
  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().port().default(6379),
  REDIS_PASSWORD: Joi.string().allow('').default(''),
  REDIS_DB: Joi.number().min(0).max(15).default(0),

  // Security
  BCRYPT_ROUNDS: Joi.number().min(10).max(14).default(12),
  MFA_APP_NAME: Joi.string().default('Vetos Platform'),

  // Throttle
  THROTTLE_SHORT_TTL: Joi.number().default(1000),
  THROTTLE_SHORT_LIMIT: Joi.number().default(10),
  THROTTLE_MEDIUM_TTL: Joi.number().default(60000),
  THROTTLE_MEDIUM_LIMIT: Joi.number().default(100),
  THROTTLE_LONG_TTL: Joi.number().default(3600000),
  THROTTLE_LONG_LIMIT: Joi.number().default(1000),

  // Queue Redis
  QUEUE_REDIS_HOST: Joi.string().default('localhost'),
  QUEUE_REDIS_PORT: Joi.number().port().default(6379),
  QUEUE_REDIS_PASSWORD: Joi.string().allow('').default(''),
  QUEUE_REDIS_DB: Joi.number().min(0).max(15).default(1),

  // Email
  SMTP_HOST: Joi.string().default('smtp.sendgrid.net'),
  SMTP_PORT: Joi.number().port().default(587),
  SMTP_SECURE: Joi.boolean().default(false),
  SMTP_USER: Joi.string().allow('').default(''),
  SMTP_PASS: Joi.string().allow('').default(''),
  SMTP_FROM_NAME: Joi.string().default('Vetos Platform'),
  SMTP_FROM_EMAIL: Joi.string().email().default('noreply@vetos.com'),

  // Jobs
  APPOINTMENT_REMINDER_HOURS: Joi.string().default('24,2'),
  SUBSCRIPTION_EXPIRY_WARNING_DAYS: Joi.string().default('30,14,7,3,1'),
});
