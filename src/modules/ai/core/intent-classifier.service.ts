import { Injectable, Logger } from '@nestjs/common';
import { AiProviderService, IAiResponse } from './ai-provider.service';

export type IntentType =
  | 'booking'
  | 'rescheduling'
  | 'cancellation'
  | 'emergency'
  | 'refill'
  | 'faq'
  | 'staff_transfer'
  | 'unknown';

export interface IIntentResult {
  intent: IntentType;
  confidence: number;
  entities: Record<string, string>;
  rawResponse: IAiResponse;
}

const INTENT_SYSTEM_PROMPT = `You are an intent classifier for a veterinary clinic system.
Classify the user's message into exactly one intent and extract entities.

Intents:
- booking: wants to make a new appointment
- rescheduling: wants to change an existing appointment
- cancellation: wants to cancel an appointment
- emergency: describes urgent medical symptoms (but use only if emergency_detector already flagged it OR very clear)
- refill: wants medication refilled
- faq: asking a question (services, hours, pricing, vets, etc.)
- staff_transfer: wants to speak with a human
- unknown: cannot determine intent

Respond ONLY with valid JSON:
{
  "intent": "<intent>",
  "confidence": <0.0-1.0>,
  "entities": {
    "pet_name": "<if mentioned>",
    "species": "<if mentioned>",
    "date_mentioned": "<if mentioned>",
    "vet_mentioned": "<if mentioned>",
    "service_mentioned": "<if mentioned>"
  }
}`;

@Injectable()
export class IntentClassifierService {
  private readonly logger = new Logger(IntentClassifierService.name);

  constructor(private readonly ai: AiProviderService) {}

  async classify(
    userMessage: string,
    conversationHistory: string = '',
  ): Promise<IIntentResult> {
    const contextBlock = conversationHistory
      ? `\nRecent conversation context:\n${conversationHistory}\n`
      : '';

    const response = await this.ai.complete({
      messages: [
        { role: 'system', content: INTENT_SYSTEM_PROMPT },
        {
          role: 'user',
          content: `${contextBlock}User message: "${userMessage}"`,
        },
      ],
      temperature: 0.1,
      maxTokens: 200,
      jsonMode: true,
    });

    try {
      const parsed = this.ai.parseJson<{
        intent: IntentType;
        confidence: number;
        entities: Record<string, string>;
      }>(response.content);

      return {
        intent: parsed.intent ?? 'unknown',
        confidence: parsed.confidence ?? 0,
        entities: parsed.entities ?? {},
        rawResponse: response,
      };
    } catch {
      this.logger.warn(
        `Intent classification parse failed: ${response.content}`,
      );
      return {
        intent: 'unknown',
        confidence: 0,
        entities: {},
        rawResponse: response,
      };
    }
  }
}
