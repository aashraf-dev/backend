import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';

import { QueueName } from '../../../shared/queues/queue-names.constant';
import { JobName } from '../../../shared/queues/job-names.constant';
import { EmailService } from '../email/email.service';
import { IEmailDispatchJob } from '../interfaces';

@Processor(QueueName.EMAIL_DISPATCH, {
  concurrency: 5,
})
export class EmailDispatchConsumer extends WorkerHost {
  private readonly logger = new Logger(EmailDispatchConsumer.name);

  constructor(private readonly emailService: EmailService) {
    super();
  }

  async process(job: Job<IEmailDispatchJob>): Promise<void> {
    this.logger.log(
      `Processing email job [${job.name}] id=${job.id} → ${job.data.to}`,
    );

    try {
      await this.emailService.dispatch(job.data);
    } catch (err) {
      this.logger.error(
        `Email dispatch failed for job ${job.id}: ${(err as Error).message}`,
      );
      throw err; // Let BullMQ handle retry backoff
    }
  }
}
