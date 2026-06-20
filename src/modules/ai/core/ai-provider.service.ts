import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

export interface IAiRequest {
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
}

export interface IAiResponse {
  content: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  durationMs: number;
}

@Injectable()
export class AiProviderService {
  private readonly logger = new Logger(AiProviderService.name);
  private readonly client: OpenAI;
  private readonly model: string;
  private readonly defaultTemp: number;
  private readonly defaultMaxTokens: number;

  constructor(private readonly configService: ConfigService) {
    this.client = new OpenAI({
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
    });
    this.model = this.configService.get<string>('OPENAI_MODEL') ?? 'gpt-4o';
    this.defaultTemp = parseFloat(
      this.configService.get<string>('OPENAI_TEMPERATURE') ?? '0.3',
    );
    this.defaultMaxTokens = parseInt(
      this.configService.get<string>('OPENAI_MAX_TOKENS') ?? '4096',
      10,
    );
  }

  async complete(req: IAiRequest): Promise<IAiResponse> {
    const start = Date.now();

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: req.messages,
        temperature: req.temperature ?? this.defaultTemp,
        max_tokens: req.maxTokens ?? this.defaultMaxTokens,
        ...(req.jsonMode && {
          response_format: { type: 'json_object' },
        }),
      });

      const choice = response.choices[0];

      return {
        content: choice.message.content ?? '',
        promptTokens: response.usage?.prompt_tokens ?? 0,
        completionTokens: response.usage?.completion_tokens ?? 0,
        totalTokens: response.usage?.total_tokens ?? 0,
        durationMs: Date.now() - start,
      };
    } catch (err) {
      this.logger.error(
        `OpenAI request failed after ${Date.now() - start}ms: ${(err as Error).message}`,
      );
      throw new ServiceUnavailableException(
        'AI service temporarily unavailable',
      );
    }
  }

  /** Parse JSON from AI response, stripping code fences if present */
  parseJson<T>(content: string): T {
    const clean = content.replace(/```json|```/g, '').trim();
    return JSON.parse(clean) as T;
  }

  /** Estimate token count for cost pre-checking (rough: 1 token ≈ 4 chars) */
  estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }
}
