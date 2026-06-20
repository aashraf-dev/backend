import { Injectable, Logger } from '@nestjs/common';
import { AiProviderService } from '../core/ai-provider.service';
import { AiCostGuardService } from '../core/ai-cost-guard.service';
import { TenantRepositoryFactory } from '../../../database/tenant-repository';
import {
  WorkflowActionEntity,
  WorkflowTrigger,
} from '../entities/tenant/workflow-action.entity';
import { IWorkflowContext, IWorkflowRule } from './rules/index';
import { NoShowRule } from './rules/no-show.rule';
import { VisitCompletedRule } from './rules/visit-completed.rule';

@Injectable()
export class WorkflowService {
  private readonly logger = new Logger(WorkflowService.name);
  private readonly rules: Map<WorkflowTrigger, IWorkflowRule>;

  constructor(
    private readonly ai: AiProviderService,
    private readonly costGuard: AiCostGuardService,
    private readonly repoFactory: TenantRepositoryFactory,
  ) {
    this.rules = new Map([
      ['appointment_no_show', new NoShowRule()],
      ['visit_completed', new VisitCompletedRule()],
    ]);
  }

  async execute(
    trigger: WorkflowTrigger,
    ctx: IWorkflowContext,
  ): Promise<void> {
    const rule = this.rules.get(trigger);
    if (!rule) {
      this.logger.debug(`No rule for trigger: ${trigger}`);
      return;
    }

    const result = await rule.evaluate(ctx);
    if (!result.shouldAct) return;

    // Log the pending action
    const action = await this.repoFactory
      .for(WorkflowActionEntity, ctx.schema)
      .save({
        trigger,
        actionType: result.actionType as WorkflowActionEntity['actionType'],
      });

    // If AI content generation is needed
    if (result.aiPrompt) {
      try {
        await this.costGuard.assertQuotaAvailable(ctx.tenantId);

        const aiResponse = await this.ai.complete({
          messages: [
            {
              role: 'system',
              content:
                'You are a professional veterinary clinic communication assistant. Write clear, empathetic content.',
            },
            { role: 'user', content: result.aiPrompt },
          ],
          temperature: 0.6,
          maxTokens: 400,
        });

        await this.costGuard.recordUsage(
          ctx.tenantId,
          null,
          `workflow_${trigger}`,
          aiResponse,
        );

        await this.repoFactory
          .for(WorkflowActionEntity, ctx.schema)
          .update(action.id, {
            aiGeneratedContent: aiResponse.content,
            status: 'executed',
            executedAt: new Date(),
          });

        this.logger.log(
          `Workflow action ${action.id} executed for trigger ${trigger}`,
        );
      } catch (err) {
        this.logger.error(
          `Workflow AI generation failed: ${(err as Error).message}`,
        );
        await this.repoFactory
          .for(WorkflowActionEntity, ctx.schema)
          .update(action.id, { status: 'skipped' });
      }
    } else {
      await this.repoFactory
        .for(WorkflowActionEntity, ctx.schema)
        .update(action.id, { status: 'executed', executedAt: new Date() });
    }
  }

  async override(
    schema: string,
    actionId: string,
    overriddenBy: string,
    reason: string,
  ): Promise<void> {
    await this.repoFactory.for(WorkflowActionEntity, schema).update(actionId, {
      status: 'overridden',
      overriddenBy,
      overrideReason: reason,
    });
  }
}
