import { WorkflowTrigger } from '../../entities/tenant/workflow-action.entity';

export interface IWorkflowContext {
  schema: string;
  tenantId: string;
  tenantName: string;
  resourceId: string;
  resourceType: string;
  payload: Record<string, unknown>;
}

export interface IWorkflowRuleResult {
  shouldAct: boolean;
  actionType: string;
  aiPrompt?: string;
  metadata: Record<string, unknown>;
}

export interface IWorkflowRule {
  trigger: WorkflowTrigger;
  evaluate(ctx: IWorkflowContext): Promise<IWorkflowRuleResult>;
}
