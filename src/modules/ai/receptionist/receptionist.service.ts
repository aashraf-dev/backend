import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Twilio from 'twilio';

import { AiProviderService } from '../core/ai-provider.service';
import { AiCostGuardService } from '../core/ai-cost-guard.service';
import { AiContextService } from '../core/ai-context.service';
import { IntentClassifierService } from '../core/intent-classifier.service';
import { EmergencyDetectorService } from '../core/emergency-detector.service';
import { TranscriptionService } from './transcription.service';
import { TenantConnectionService } from '../../../database/tenant-connection.service';
import { TenantRepositoryFactory } from '../../../database/tenant-repository';
import { CallTranscriptEntity } from '../entities/tenant/call-transcipt.entity';
import type { ICallTurn } from '../entities/tenant/call-transcipt.entity';
import type { CallOutcome } from '../entities/tenant/call-transcipt.entity';

const RECEPTIONIST_PROMPT = (clinicCtx: string) =>
  `
You are an AI phone receptionist for a veterinary clinic. You are warm, professional, and efficient.

${clinicCtx}

YOUR JOB:
- Answer general questions about the clinic
- Help callers book, reschedule, or cancel appointments
- Detect emergencies and immediately provide emergency guidance
- Transfer to staff when requested or when you cannot help

RESPONSE FORMAT:
Respond ONLY with valid JSON:
{
  "speak": "<What to say out loud — natural, conversational>",
  "action": "continue|gather|transfer|hangup",
  "intent": "booking|rescheduling|cancellation|emergency|faq|refill|staff_transfer|unknown",
  "emergencyDetected": true|false,
  "complete": true|false
}

"action" meanings:
- continue: AI speaks and waits for next input
- gather: collect specific information from caller
- transfer: transfer to human staff immediately
- hangup: conversation is complete

If emergency detected, action MUST be "transfer" with emergencyDetected: true.
Keep responses under 50 words for voice delivery.
`.trim();

@Injectable()
export class ReceptionistService {
  private readonly logger = new Logger(ReceptionistService.name);
  private readonly twilio: Twilio.Twilio;
  private readonly phoneNumber: string;
  private readonly webhookBase: string;

  constructor(
    private readonly ai: AiProviderService,
    private readonly costGuard: AiCostGuardService,
    private readonly ctxService: AiContextService,
    private readonly intentSvc: IntentClassifierService,
    private readonly emergencySvc: EmergencyDetectorService,
    private readonly transcription: TranscriptionService,
    private readonly tenantConn: TenantConnectionService,
    private readonly repoFactory: TenantRepositoryFactory,
    private readonly configService: ConfigService,
  ) {
    const sid = this.configService.get<string>('TWILIO_ACCOUNT_SID');
    const token = this.configService.get<string>('TWILIO_AUTH_TOKEN');
    this.phoneNumber =
      this.configService.get<string>('TWILIO_PHONE_NUMBER') ?? '';
    this.webhookBase =
      this.configService.get<string>('TWILIO_WEBHOOK_BASE_URL') ?? '';

    if (sid && token) {
      this.twilio = new Twilio(sid, token);
    }
  }

  /**
   * Handle inbound call — return TwiML for the first greeting.
   * Twilio calls this when a call is received.
   */
  async handleInboundCall(
    callSid: string,
    callerPhone: string,
    schema: string,
    tenantId: string,
    tenantName: string,
  ): Promise<string> {
    // Create transcript record
    await this.repoFactory.for(CallTranscriptEntity, schema).save({
      twilioCallSid: callSid,
      callerPhone,
      conversationTurns: [],
    });

    const clinicCtx = await this.ctxService.buildClinicContext(
      schema,
      tenantName,
    );

    return this.buildTwiML({
      say: `Thank you for calling ${tenantName}. I'm your AI assistant. How can I help you today?`,
      gatherAction: `${this.webhookBase}/api/v1/ai/receptionist/gather/${callSid}`,
    });
  }

  /**
   * Process caller's spoken input — return next TwiML action.
   */
  async handleGather(
    callSid: string,
    callerPhone: string,
    speechResult: string,
    schema: string,
    tenantId: string,
    tenantName: string,
  ): Promise<string> {
    const transcript = await this.repoFactory
      .for(CallTranscriptEntity, schema)
      .findOne({ where: { twilioCallSid: callSid } });

    if (!transcript) {
      return this.buildTwiML({
        say: "I'm sorry, there was an issue with your call. Please hold while I transfer you.",
        transferTo: this.phoneNumber,
      });
    }

    // Emergency check first
    const emergency = this.emergencySvc.detect(speechResult);
    if (emergency.isEmergency) {
      await this.repoFactory
        .for(CallTranscriptEntity, schema)
        .update(transcript.id, {
          emergencyFlagged: true,
          outcome: 'emergency_escalated',
        });

      return this.buildTwiML({
        say: "This sounds like an emergency. I'm transferring you to our emergency line immediately. Please stay on the line.",
        transferTo: this.phoneNumber,
      });
    }

    // Build conversation history
    const turns = transcript.conversationTurns ?? [];
    const historyStr = turns
      .slice(-4)
      .map((t) => `${t.speaker === 'caller' ? 'Caller' : 'AI'}: ${t.text}`)
      .join('\n');

    try {
      await this.costGuard.assertQuotaAvailable(tenantId);

      const clinicCtx = await this.ctxService.buildClinicContext(
        schema,
        tenantName,
      );

      const aiResponse = await this.ai.complete({
        messages: [
          { role: 'system', content: RECEPTIONIST_PROMPT(clinicCtx) },
          ...(historyStr
            ? [
                {
                  role: 'user' as const,
                  content: `Previous conversation:\n${historyStr}`,
                },
              ]
            : []),
          { role: 'user', content: `Caller said: "${speechResult}"` },
        ],
        temperature: 0.4,
        maxTokens: 300,
        jsonMode: true,
      });

      await this.costGuard.recordUsage(
        tenantId,
        null,
        'receptionist',
        aiResponse,
      );

      let parsed: any;
      try {
        parsed = this.ai.parseJson<any>(aiResponse.content);
      } catch {
        parsed = {
          speak: "I'm sorry, could you please repeat that?",
          action: 'gather',
        };
      }

      // Update transcript
      const newTurns: ICallTurn[] = [
        ...turns,
        {
          speaker: 'caller',
          text: speechResult,
          timestamp: new Date().toISOString(),
        },
        {
          speaker: 'ai',
          text: parsed.speak,
          timestamp: new Date().toISOString(),
          intent: parsed.intent,
        },
      ];

      await this.repoFactory
        .for(CallTranscriptEntity, schema)
        .update(transcript.id, {
          conversationTurns: newTurns,
          intent: parsed.intent,
          transferredToStaff: parsed.action === 'transfer',
        });

      if (parsed.action === 'transfer') {
        return this.buildTwiML({
          say: parsed.speak,
          transferTo: this.phoneNumber,
        });
      }

      if (parsed.action === 'hangup' || parsed.complete) {
        await this.repoFactory
          .for(CallTranscriptEntity, schema)
          .update(transcript.id, { outcome: this.determineOutcome(newTurns) });
        return this.buildTwiML({ say: parsed.speak, hangup: true });
      }

      return this.buildTwiML({
        say: parsed.speak,
        gatherAction: `${this.webhookBase}/api/v1/ai/receptionist/gather/${callSid}`,
      });
    } catch (err) {
      this.logger.error(
        `Receptionist error for call ${callSid}: ${(err as Error).message}`,
      );
      return this.buildTwiML({
        say: 'I apologize for the difficulty. Let me connect you with our staff.',
        transferTo: this.phoneNumber,
      });
    }
  }

  // ── TwiML builder ─────────────────────────────────────────────────────

  private buildTwiML(opts: {
    say: string;
    gatherAction?: string;
    transferTo?: string;
    hangup?: boolean;
  }): string {
    const VoiceResponse = Twilio.twiml.VoiceResponse;
    const twiml = new VoiceResponse();

    if (opts.gatherAction) {
      const gather = twiml.gather({
        input: 'speech',
        action: opts.gatherAction,
        speechTimeout: 'auto',
        speechModel: 'experimental_conversations',
        language: 'en-US',
      });
      gather.say({ voice: 'Polly.Joanna' }, opts.say);
    } else {
      twiml.say({ voice: 'Polly.Joanna' }, opts.say);
    }

    if (opts.transferTo) {
      twiml.dial(opts.transferTo);
    }

    if (opts.hangup) {
      twiml.hangup();
    }

    return twiml.toString();
  }

  private determineOutcome(turns: ICallTurn[]): CallOutcome {
    const intents = turns.map((t) => t.intent).filter(Boolean);
    if (intents.includes('booking')) return 'appointment_booked';
    if (intents.includes('rescheduling')) return 'appointment_rescheduled';
    if (intents.includes('cancellation')) return 'appointment_cancelled';
    if (intents.includes('faq')) return 'question_answered';
    if (intents.includes('refill')) return 'refill_requested';
    return 'abandoned';
  }
}
