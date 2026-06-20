import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { ChatbotService } from './chatbot.service';
import { AppContexts } from '../../../core/decorators/app-contexts.decorator';
import { CurrentUser } from '../../../core/decorators/current-user.decorator';
import { AppContext } from '../../../shared/enums/app-context.enum';
import type { IJwtPayload } from '../../../shared/interfaces/jwt-payload.interface';
import { SendMessageDto } from './dto';
import { ClsService } from 'nestjs-cls';
import { IClsStore } from '../../../core/context/request-context';
import { TenantRepositoryFactory } from '../../../database/tenant-repository';
import { AiConversationEntity } from '../entities/tenant/ai-conversation.entity';
import { AiMessageEntity } from '../entities/tenant/ai-message.entity';

@ApiTags('AI — Chatbot')
@ApiBearerAuth()
@Controller('ai/chat')
export class ChatbotController {
  constructor(
    private readonly chatbot: ChatbotService,
    private readonly cls: ClsService<IClsStore>,
    private readonly repoFactory: TenantRepositoryFactory,
  ) {}

  @Post()
  @AppContexts(AppContext.CRM, AppContext.PORTAL)
  @ApiOperation({
    summary: 'Send a message to the AI chatbot',
    description: `
      Shared endpoint used by both the CRM and Portal frontends.
      Automatically scoped to the requesting tenant.
      Returns intent classification, emergency detection, and AI reply.
    `,
  })
  send(@Body() dto: SendMessageDto, @CurrentUser() user: IJwtPayload) {
    const surface =
      this.cls.get('APP_CONTEXT') === AppContext.CRM ? 'crm' : 'portal';
    return this.chatbot.chat(dto, user, surface);
  }

  @Get('history/:conversationId')
  @AppContexts(AppContext.CRM, AppContext.PORTAL)
  @ApiOperation({ summary: 'Get conversation message history' })
  async getHistory(
    @Param('conversationId', ParseUUIDPipe) conversationId: string,
    @CurrentUser() _user: IJwtPayload,
  ) {
    const schema = this.cls.get('TENANT_SCHEMA')!;
    const messages = await this.repoFactory.for(AiMessageEntity, schema).find({
      where: { conversationId },
      order: { createdAt: 'ASC' },
    });
    return messages;
  }
}
