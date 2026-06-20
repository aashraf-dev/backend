import { IWorkflowRule, IWorkflowContext, IWorkflowRuleResult } from './index';

export class NoShowRule implements IWorkflowRule {
  readonly trigger = 'appointment_no_show' as const;

  async evaluate(ctx: IWorkflowContext): Promise<IWorkflowRuleResult> {
    const { petName, ownerName, ownerPhone, vetName, appointmentDate } =
      ctx.payload as any;

    return {
      shouldAct: true,
      actionType: 'generate_call_script',
      aiPrompt: `
Write a short, empathetic phone call script for a veterinary clinic receptionist.
The patient ${petName} (owned by ${ownerName}) missed their appointment with Dr. ${vetName} on ${appointmentDate}.
Goal: Re-engage the client, express care, and offer to reschedule.
Keep it under 80 words, warm and non-judgmental.
      `.trim(),
      metadata: { petName, ownerName, ownerPhone, vetName, appointmentDate },
    };
  }
}
