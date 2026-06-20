import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { WorkflowService } from './workflow.service';

/** Domain events — fire these from CRM services using EventEmitter2 */
export const WORKFLOW_EVENTS = {
  NO_SHOW: 'appointment.no_show',
  VISIT_COMPLETED: 'appointment.completed',
  LAB_ABNORMAL: 'lab_result.abnormal',
} as const;

export interface INoShowEvent {
  schema: string;
  tenantId: string;
  tenantName: string;
  appointmentId: string;
  petName: string;
  ownerName: string;
  ownerPhone: string;
  vetName: string;
  appointmentDate: string;
}

export interface IVisitCompletedEvent {
  schema: string;
  tenantId: string;
  tenantName: string;
  appointmentId: string;
  petName: string;
  ownerEmail: string;
  diagnosis?: string;
  followUpDays?: number;
}

@Injectable()
export class WorkflowEventListener {
  private readonly logger = new Logger(WorkflowEventListener.name);

  constructor(private readonly workflowService: WorkflowService) {}

  @OnEvent(WORKFLOW_EVENTS.NO_SHOW)
  async handleNoShow(event: INoShowEvent): Promise<void> {
    this.logger.log(`No-show event for appointment ${event.appointmentId}`);
    await this.workflowService.execute('appointment_no_show', {
      schema: event.schema,
      tenantId: event.tenantId,
      tenantName: event.tenantName,
      resourceId: event.appointmentId,
      resourceType: 'appointment',
      payload: event as unknown as Record<string, unknown>,
    });
  }

  @OnEvent(WORKFLOW_EVENTS.VISIT_COMPLETED)
  async handleVisitCompleted(event: IVisitCompletedEvent): Promise<void> {
    this.logger.log(
      `Visit completed event for appointment ${event.appointmentId}`,
    );
    await this.workflowService.execute('visit_completed', {
      schema: event.schema,
      tenantId: event.tenantId,
      tenantName: event.tenantName,
      resourceId: event.appointmentId,
      resourceType: 'appointment',
      payload: event as unknown as Record<string, unknown>,
    });
  }
}
