import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { EventEmitterModule } from '@nestjs/event-emitter';

import { DatabaseModule } from '../../database/database.module';

// Platform entities
import { AiUsageLogEntity } from './entities/platform/ai-usage-log.entity';
import { AiQuotaEntity } from './entities/platform/ai-quota.entity';
import { TenantEntity } from '../../database/entities/platform/tenant.entity';

// Core
import { AiProviderService } from './core/ai-provider.service';
import { AiCostGuardService } from './core/ai-cost-guard.service';
import { AiContextService } from './core/ai-context.service';
import { IntentClassifierService } from './core/intent-classifier.service';
import { EmergencyDetectorService } from './core/emergency-detector.service';

// Chatbot
import { ChatbotController } from './chatbot/chatbot.controller';
import { ChatbotService } from './chatbot/chatbot.service';
import { ConversationService } from './chatbot/conversation.service';

// SOAP
import { SoapController } from './soap/soad.controller';
import { SoapService } from './soap/soap.service';
import { AudioProcessorService } from './soap/audio-processor.service';

// Lab
import { LabInterpretationService } from './lab-interpretation/lab-interpretation.service';
import {
  LabInterpretationConsumer,
  LAB_INTERPRETATION_QUEUE,
} from './lab-interpretation/lab-interpretation.consumer';

// Receptionist
import { ReceptionistController } from './receptionist/receptionist.controller';
import { ReceptionistService } from './receptionist/receptionist.service';
import { TranscriptionService } from './receptionist/transcription.service';

// Workflow
import { WorkflowService } from './workflow/workflow.service';
import { WorkflowEventListener } from './workflow/wokflow-event.listner';

// Insights
import { InsightsController } from './insights/insights.controller';
import { InsightsService } from './insights/insights.service';
import { InsightsScheduler } from './insights/insights.scheduler';

@Module({
  imports: [
    DatabaseModule,

    TypeOrmModule.forFeature(
      [AiUsageLogEntity, AiQuotaEntity, TenantEntity],
      'platform',
    ),

    BullModule.registerQueue({ name: LAB_INTERPRETATION_QUEUE }),
  ],
  controllers: [
    ChatbotController,
    SoapController,
    ReceptionistController,
    InsightsController,
  ],
  providers: [
    // Core
    AiProviderService,
    AiCostGuardService,
    AiContextService,
    IntentClassifierService,
    EmergencyDetectorService,

    // Chatbot
    ChatbotService,
    ConversationService,

    // SOAP
    SoapService,
    AudioProcessorService,

    // Lab
    LabInterpretationService,
    LabInterpretationConsumer,

    // Receptionist
    ReceptionistService,
    TranscriptionService,

    // Workflow
    WorkflowService,
    WorkflowEventListener,

    // Insights
    InsightsService,
    InsightsScheduler,
  ],
  exports: [
    // Exported so CRM and Portal services can use them
    ChatbotService,
    SoapService,
    LabInterpretationService,
    WorkflowService,
    InsightsService,
    AiCostGuardService,
    EmergencyDetectorService,
  ],
})
export class AiModule {}
