import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { LabInterpretationService } from './lab-interpretation.service';

export const LAB_INTERPRETATION_QUEUE = 'lab-interpretation';

export interface ILabInterpretationJob {
  schema: string;
  tenantId: string;
  medicalRecordId: string;
  requestedById: string;
}

@Processor(LAB_INTERPRETATION_QUEUE, { concurrency: 3 })
export class LabInterpretationConsumer extends WorkerHost {
  private readonly logger = new Logger(LabInterpretationConsumer.name);

  constructor(private readonly labService: LabInterpretationService) {
    super();
  }

  async process(job: Job<ILabInterpretationJob>): Promise<void> {
    const { schema, tenantId, medicalRecordId, requestedById } = job.data;

    this.logger.log(
      `Processing lab interpretation for record ${medicalRecordId}`,
    );

    try {
      await this.labService.interpret(
        schema,
        tenantId,
        medicalRecordId,
        requestedById,
      );
      this.logger.log(
        `Lab interpretation complete for record ${medicalRecordId}`,
      );
    } catch (err) {
      this.logger.error(
        `Lab interpretation failed for ${medicalRecordId}: ${(err as Error).message}`,
      );
      throw err;
    }
  }
}
