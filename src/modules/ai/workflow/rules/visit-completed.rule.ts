import { IWorkflowRule, IWorkflowContext, IWorkflowRuleResult } from './index';

export class VisitCompletedRule implements IWorkflowRule {
  readonly trigger = 'visit_completed' as const;

  async evaluate(ctx: IWorkflowContext): Promise<IWorkflowRuleResult> {
    const { petName, ownerEmail, diagnosis, followUpDays } = ctx.payload as any;

    if (!followUpDays && !diagnosis) {
      return { shouldAct: false, actionType: 'none', metadata: {} };
    }

    return {
      shouldAct: true,
      actionType: 'send_email',
      aiPrompt: `
Write a warm follow-up email for a veterinary clinic to a pet owner after their pet's visit.
Pet: ${petName}
${diagnosis ? `Visit summary: ${diagnosis}` : ''}
${followUpDays ? `Follow-up recommended in: ${followUpDays} days` : ''}
Keep it under 100 words. Warm, caring tone. End with a call-to-action to book the follow-up.
Do not include medical advice or diagnoses.
      `.trim(),
      metadata: { petName, ownerEmail, followUpDays },
    };
  }
}
