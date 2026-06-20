import { Injectable } from '@nestjs/common';
import { TenantConnectionService } from '../../../database/tenant-connection.service';
import { TenantRepositoryFactory } from '../../../database/tenant-repository';
import { AiConversationEntity } from '../entities/tenant/ai-conversation.entity';
import {
  AiMessageEntity,
  MessageRole,
  MessageIntent,
} from '../entities/tenant/ai-message.entity';
import { RedisService } from '../../../shared/redis/redis.service';

@Injectable()
export class ConversationService {
  // Keep last N turns in Redis for context window
  private readonly HISTORY_TURNS = 6;

  constructor(
    private readonly repoFactory: TenantRepositoryFactory,
    private readonly tenantConn: TenantConnectionService,
    private readonly redis: RedisService,
  ) {}

  async getOrCreate(
    schema: string,
    userId: string | null,
    surface: 'crm' | 'portal' | 'voice',
    conversationId?: string,
  ): Promise<AiConversationEntity> {
    if (conversationId) {
      const existing = await this.repoFactory
        .for(AiConversationEntity, schema)
        .findOne({ where: { id: conversationId } });
      if (existing && existing.status === 'active') return existing;
    }

    return this.repoFactory.for(AiConversationEntity, schema).save({
      userId,
      surface,
      status: 'active',
      emergencyFlagged: false,
      metadata: {},
    });
  }

  async appendMessage(
    schema: string,
    conversationId: string,
    role: MessageRole,
    content: string,
    intent?: MessageIntent,
    intentConfidence?: number,
    emergencyDetected?: boolean,
    promptTokens?: number,
    completionTokens?: number,
  ): Promise<AiMessageEntity> {
    const msg = await this.repoFactory.for(AiMessageEntity, schema).save({
      conversationId,
      role,
      content,
      intent: intent ?? null,
      intentConfidence: intentConfidence ?? null,
      emergencyDetected: emergencyDetected ?? false,
      promptTokens: promptTokens ?? 0,
      completionTokens: completionTokens ?? 0,
    });

    // Update Redis rolling history
    const key = `ai:conv:${conversationId}`;
    const history = await this.getHistory(conversationId);
    history.push({ role, content });

    // Keep last N turns
    const trimmed = history.slice(-this.HISTORY_TURNS * 2);
    await this.redis.set(key, JSON.stringify(trimmed), 3600);

    return msg;
  }

  async getHistory(
    conversationId: string,
  ): Promise<Array<{ role: string; content: string }>> {
    const key = `ai:conv:${conversationId}`;
    const cached = await this.redis.get(key);
    return cached ? JSON.parse(cached) : [];
  }

  async flagEmergency(schema: string, conversationId: string): Promise<void> {
    await this.repoFactory
      .for(AiConversationEntity, schema)
      .update(conversationId, { emergencyFlagged: true });
  }

  async close(schema: string, conversationId: string): Promise<void> {
    await this.repoFactory
      .for(AiConversationEntity, schema)
      .update(conversationId, { status: 'closed' });
    await this.redis.del(`ai:conv:${conversationId}`);
  }
}
