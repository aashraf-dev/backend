import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';

import { IEmailDispatchJob } from '../interfaces';
import {
  appointmentReminderTemplate,
  subscriptionExpiryTemplate,
  registrationWelcomeTemplate,
  passwordResetTemplate,
} from './templates';

/**
 * Thin wrapper over Nodemailer. Template rendering happens here
 * so consumers simply pass an IEmailDispatchJob and get fire-and-forget.
 */
@Injectable()
export class EmailService implements OnModuleInit {
  private readonly logger = new Logger(EmailService.name);
  private transporter!: Transporter;
  private readonly fromAddress: string;

  constructor(private readonly configService: ConfigService) {
    const cfg = this.configService.get('app.email')!;
    this.fromAddress = `"${cfg.fromName}" <${cfg.fromEmail}>`;
  }

  onModuleInit(): void {
    const cfg = this.configService.get('app.email')!;

    this.transporter = nodemailer.createTransport({
      host: cfg.host,
      port: cfg.port,
      secure: cfg.secure,
      auth: {
        user: cfg.user,
        pass: cfg.pass,
      },
      pool: true,
      maxConnections: 5,
      maxMessages: 100,
    });

    this.logger.log(`Email transporter ready — ${cfg.host}:${cfg.port}`);
  }

  // ── Send email from job payload ────────────────────────────────────

  async dispatch(job: IEmailDispatchJob): Promise<void> {
    const { subject, html, text } = this.render(job);

    try {
      const info = await this.transporter.sendMail({
        from: this.fromAddress,
        to: job.to,
        subject: subject ?? job.subject,
        html,
        text,
      });

      this.logger.log(
        `Email sent → ${job.to} [${job.template}] msgId: ${info.messageId}`,
      );
    } catch (err) {
      this.logger.error(
        `Email delivery failed → ${job.to} [${job.template}]: ${(err as Error).message}`,
        (err as Error).stack,
      );
      throw err; // Re-throw so BullMQ can retry
    }
  }

  // ── Shorthand helpers called by producers ─────────────────────────

  buildAppointmentReminderPayload(
    context: Parameters<typeof appointmentReminderTemplate>[0],
  ): Pick<IEmailDispatchJob, 'subject' | 'template' | 'context'> {
    const { subject } = appointmentReminderTemplate(context);
    return {
      subject,
      template: 'appointment-reminder',
      context: context as any,
    };
  }

  buildWelcomePayload(
    context: Parameters<typeof registrationWelcomeTemplate>[0],
  ): Pick<IEmailDispatchJob, 'subject' | 'template' | 'context'> {
    const { subject } = registrationWelcomeTemplate(context);
    return {
      subject,
      template: 'registration-welcome',
      context: context,
    };
  }

  buildPasswordResetPayload(
    context: Parameters<typeof passwordResetTemplate>[0],
  ): Pick<IEmailDispatchJob, 'subject' | 'template' | 'context'> {
    const { subject } = passwordResetTemplate(context);
    return { subject, template: 'password-reset', context: context };
  }

  // ── Verify connection ──────────────────────────────────────────────

  async verifyConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      return true;
    } catch {
      return false;
    }
  }

  // ── Private: template renderer ─────────────────────────────────────

  private render(job: IEmailDispatchJob): {
    subject: string;
    html: string;
    text: string;
  } {
    const ctx = job.context as any;

    switch (job.template) {
      case 'appointment-reminder':
        return appointmentReminderTemplate(ctx);
      case 'subscription-expiry':
        return subscriptionExpiryTemplate(ctx);
      case 'registration-welcome':
        return registrationWelcomeTemplate(ctx);
      case 'password-reset':
        return passwordResetTemplate(ctx);
      default:
        return {
          subject: job.subject,
          html: `<p>${job.subject}</p>`,
          text: job.subject,
        };
    }
  }
}

// nodemailer types are bundled — no separate @types needed
import 'nodemailer';
