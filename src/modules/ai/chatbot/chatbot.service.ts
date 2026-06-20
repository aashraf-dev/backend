import { Injectable, Logger } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';

import { AiProviderService } from '../core/ai-provider.service';
import { AiCostGuardService } from '../core/ai-cost-guard.service';
import { AiContextService } from '../core/ai-context.service';
import { IntentClassifierService } from '../core/intent-classifier.service';
import { EmergencyDetectorService } from '../core/emergency-detector.service';
import { ConversationService } from './conversation.service';
import { IClsStore } from '../../../core/context/request-context';
import { IJwtPayload } from '../../../shared/interfaces/jwt-payload.interface';
import { SendMessageDto } from './dto';

const CHATBOT_SYSTEM_PROMPT = (clinicContext: string) =>
  `
You are a friendly and helpful AI assistant for a veterinary clinic.
Your job is to help pet owners and clinic staff with appointments,
general questions, and clinic information.

${clinicContext}

STRICT RULES:
1. NEVER provide diagnoses, medical advice, or treatment recommendations.
2. For any medical concern, always recommend speaking with a veterinarian.
3. Keep responses concise and warm — this is a consumer-facing app.
4. If you detect a potential emergency, respond IMMEDIATELY with:
   "🚨 This sounds like it could be an emergency. Please call the clinic immediately or go to the nearest emergency veterinary center. Do not wait for an appointment."
5. For booking requests, confirm the pet name, preferred date, and veterinarian preference.
6. Always maintain a warm, caring tone appropriate for pet owners.
7. If you cannot help with a request, offer to connect them with clinic staff.
`.trim();

export interface IChatbotResponse {
  conversationId: string;
  reply: string;
  intent: string;
  intentConfidence: number;
  emergencyDetected: boolean;
  escalateToStaff: boolean;
  suggestedActions: string[];
}

@Injectable()
export class ChatbotService {
  private readonly logger = new Logger(ChatbotService.name);

  constructor(
    private readonly ai: AiProviderService,
    private readonly costGuard: AiCostGuardService,
    private readonly ctxService: AiContextService,
    private readonly intentSvc: IntentClassifierService,
    private readonly emergencySvc: EmergencyDetectorService,
    private readonly convSvc: ConversationService,
    private readonly cls: ClsService<IClsStore>,
  ) {}

  async chat(
    dto: SendMessageDto,
    user: IJwtPayload,
    surface: 'crm' | 'portal',
  ): Promise<IChatbotResponse> {
    const schema = this.cls.get('TENANT_SCHEMA')!;
    const tenantId = this.cls.get('TENANT_ID')!;
    const tenantName = this.cls.get('TENANT_NAME');

    // 1. Pre-flight: quota check
    await this.costGuard.assertQuotaAvailable(tenantId);

    // 2. Get or create conversation
    const conversation = await this.convSvc.getOrCreate(
      schema,
      user.sub,
      surface,
      dto.conversationId,
    );

    // 3. Emergency detection (deterministic, before LLM)
    const emergency = this.emergencySvc.detect(dto.message);
    if (emergency.isEmergency) {
      await this.convSvc.flagEmergency(schema, conversation.id);
      await this.convSvc.appendMessage(
        schema,
        conversation.id,
        'user',
        dto.message,
        'emergency',
        0.99,
        true,
      );

      const emergencyReply =
        '🚨 **This sounds like a potential emergency.** Please call the clinic immediately or go to the nearest emergency veterinary center. Do not wait for an appointment.';

      await this.convSvc.appendMessage(
        schema,
        conversation.id,
        'assistant',
        emergencyReply,
        'emergency',
        0.99,
        true,
        0,
        50,
      );

      return {
        conversationId: conversation.id,
        reply: emergencyReply,
        intent: 'emergency',
        intentConfidence: emergency.confidence,
        emergencyDetected: true,
        escalateToStaff: true,
        suggestedActions: ['call_clinic', 'emergency_vet'],
      };
    }

    // 4. Build clinic context
    const clinicCtx = await this.ctxService.buildClinicContext(
      schema,
      tenantName,
    );

    // 5. Get conversation history for context
    const history = await this.convSvc.getHistory(conversation.id);
    const historyStr = history
      .slice(-6)
      .map((h) => `${h.role === 'user' ? 'User' : 'Assistant'}: ${h.content}`)
      .join('\n');

    // 6. Parallel: classify intent + build AI messages
    const [intentResult] = await Promise.all([
      this.intentSvc.classify(dto.message, historyStr),
    ]);

    // 7. Build message history for OpenAI
    const messages: Array<{
      role: 'system' | 'user' | 'assistant';
      content: string;
    }> = [
      { role: 'system', content: CHATBOT_SYSTEM_PROMPT(clinicCtx) },
      ...history.slice(-6).map((h) => ({
        role: h.role as 'user' | 'assistant',
        content: h.content,
      })),
      { role: 'user', content: dto.message },
    ];

    // 8. AI completion
    const aiResponse = await this.ai.complete({
      messages,
      temperature: 0.5,
      maxTokens: 600,
    });

    // 9. Record usage
    await this.costGuard.recordUsage(tenantId, user.sub, 'chatbot', aiResponse);

    // 10. Persist messages
    await this.convSvc.appendMessage(
      schema,
      conversation.id,
      'user',
      dto.message,
      intentResult.intent,
      intentResult.confidence,
      false,
    );
    await this.convSvc.appendMessage(
      schema,
      conversation.id,
      'assistant',
      aiResponse.content,
      intentResult.intent,
      intentResult.confidence,
      false,
      aiResponse.promptTokens,
      aiResponse.completionTokens,
    );

    // 11. Determine escalation
    const escalate =
      intentResult.intent === 'staff_transfer' || intentResult.confidence < 0.4;

    // 12. Derive suggested actions
    const suggestedActions = this.buildSuggestedActions(
      intentResult.intent,
      aiResponse.content,
    );

    return {
      conversationId: conversation.id,
      reply: aiResponse.content,
      intent: intentResult.intent,
      intentConfidence: intentResult.confidence,
      emergencyDetected: false,
      escalateToStaff: escalate,
      suggestedActions,
    };
  }

  private buildSuggestedActions(intent: string, _reply: string): string[] {
    const map: Record<string, string[]> = {
      booking: ['book_appointment'],
      rescheduling: ['view_appointments'],
      cancellation: ['view_appointments'],
      refill: ['view_prescriptions'],
      faq: [],
      staff_transfer: ['call_clinic'],
    };
    return map[intent] ?? [];
  }
}
