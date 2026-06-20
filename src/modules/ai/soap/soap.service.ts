import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { DeepgramClient } from '@deepgram/sdk';
import { ConfigService } from '@nestjs/config';

import { AiProviderService } from '../core/ai-provider.service';
import { AiCostGuardService } from '../core/ai-cost-guard.service';
import { AudioProcessorService } from './audio-processor.service';
import { TenantConnectionService } from '../../../database/tenant-connection.service';
import { TenantRepositoryFactory } from '../../../database/tenant-repository';
import {
  SoapDraftEntity,
  ISoapJson,
  IClientSummary,
} from '../entities/tenant/soap-draft.entity';
import { PetEntity } from '../../../database/entities/tenant/pet.entity';
import { ClsService } from 'nestjs-cls';
import { IClsStore } from '../../../core/context/request-context';
import { IJwtPayload } from '../../../shared/interfaces/jwt-payload.interface';
import { GenerateSoapDto, ApproveSoapDto } from './dto';

const SOAP_SYSTEM_PROMPT = `You are a veterinary SOAP note generator.
Generate a professional, structured SOAP note from the provided consultation information.

CRITICAL RULES:
1. NEVER invent diagnoses not supported by the provided information.
2. NEVER prescribe medications not explicitly mentioned.
3. Mark uncertain sections clearly with [UNCERTAIN: reason].
4. Base the assessment and plan ONLY on what is stated in the input.
5. Use professional veterinary terminology.
6. If information is insufficient for a section, write "Insufficient information provided."

Respond ONLY with valid JSON matching this exact structure:
{
  "soap": {
    "subjective": "<Owner-reported history, chief complaint, symptoms>",
    "objective": "<Physical exam findings, vitals, measurements>",
    "assessment": "<Diagnoses, differentials, clinical impressions>",
    "plan": "<Treatment, medications, follow-up, client instructions>"
  },
  "clientSummary": {
    "whatHappenedToday": "<Simple explanation for pet owner, Grade 6 reading level>",
    "whatWeFound": "<What the exam revealed in plain language>",
    "carePlan": "<What we are doing to help, in plain language>",
    "nextSteps": "<What the owner needs to do at home>"
  },
  "uncertainSections": ["<section names where AI had low confidence>"],
  "overallConfidence": <0.0-1.0>
}`;

@Injectable()
export class SoapService {
  private readonly logger = new Logger(SoapService.name);
  private readonly deepgram: DeepgramClient;

  constructor(
    private readonly ai: AiProviderService,
    private readonly costGuard: AiCostGuardService,
    private readonly audioProc: AudioProcessorService,
    private readonly tenantConn: TenantConnectionService,
    private readonly repoFactory: TenantRepositoryFactory,
    private readonly cls: ClsService<IClsStore>,
    private readonly configService: ConfigService,
  ) {
    const dgKey = this.configService.get<string>('DEEPGRAM_API_KEY');
    if (dgKey) this.deepgram = new DeepgramClient(dgKey);
  }

  // ── Generate SOAP from text ───────────────────────────────────────────

  async generate(
    dto: GenerateSoapDto,
    vet: IJwtPayload,
  ): Promise<SoapDraftEntity> {
    const schema = this.cls.get('TENANT_SCHEMA')!;
    const tenantId = this.cls.get('TENANT_ID')!;

    // Validate pet exists
    const pet = await this.repoFactory
      .for(PetEntity, schema)
      .findOne({ where: { id: dto.petId } });
    if (!pet) throw new NotFoundException(`Pet ${dto.petId} not found`);

    await this.costGuard.assertQuotaAvailable(tenantId);

    let transcript: string | null = null;
    let rawInput: string | null = dto.rawText ?? null;

    // Handle audio/video input
    if (dto.inputType !== 'text') {
      if (!dto.mediaUrl) {
        throw new BadRequestException(
          'mediaUrl is required for audio/video input',
        );
      }
      transcript = await this.transcribeMedia(dto.mediaUrl, dto.inputType);
      rawInput = transcript;
    }

    if (!rawInput?.trim()) {
      throw new BadRequestException('No consultation content provided');
    }

    // Build patient context
    const patientCtx = await this.buildPatientContext(schema, dto.petId);

    // Generate SOAP
    const aiResponse = await this.ai.complete({
      messages: [
        { role: 'system', content: SOAP_SYSTEM_PROMPT },
        {
          role: 'user',
          content: `
PATIENT INFORMATION:
${patientCtx}

CONSULTATION INPUT:
${rawInput}

Generate the SOAP note now.
          `.trim(),
        },
      ],
      temperature: 0.2,
      maxTokens: 2000,
      jsonMode: true,
    });

    await this.costGuard.recordUsage(
      tenantId,
      vet.sub,
      'soap_generation',
      aiResponse,
    );

    let parsed: any;
    try {
      parsed = this.ai.parseJson<any>(aiResponse.content);
    } catch {
      throw new BadRequestException(
        'AI failed to generate structured SOAP note. Please try again.',
      );
    }

    // Save draft
    const draft = await this.repoFactory.for(SoapDraftEntity, schema).save({
      petId: dto.petId,
      appointmentId: dto.appointmentId ?? null,
      veterinarianId: vet.sub,
      inputType: dto.inputType,
      rawInput: rawInput ?? null,
      mediaUrl: dto.mediaUrl ?? null,
      transcript: transcript ?? null,
      soapJson: parsed.soap ?? null,
      clientSummary: parsed.clientSummary ?? null,
      uncertainSections: parsed.uncertainSections ?? [],
      overallConfidence: parsed.overallConfidence ?? null,
      status: 'draft',
      portalPublished: false,
    });

    this.logger.log(
      `SOAP draft ${draft.id} generated for pet ${dto.petId} by vet ${vet.sub}`,
    );

    return draft;
  }

  // ── Approve SOAP draft ────────────────────────────────────────────────

  async approve(
    draftId: string,
    dto: ApproveSoapDto,
    vet: IJwtPayload,
  ): Promise<SoapDraftEntity> {
    const schema = this.cls.get('TENANT_SCHEMA')!;

    const draft = await this.repoFactory
      .for(SoapDraftEntity, schema)
      .findOne({ where: { id: draftId } });

    if (!draft) throw new NotFoundException(`SOAP draft ${draftId} not found`);
    if (draft.status !== 'draft') {
      throw new BadRequestException(`Draft is already ${draft.status}`);
    }
    if (draft.veterinarianId !== vet.sub) {
      throw new ForbiddenException(
        'Only the attending vet can approve this draft',
      );
    }

    const wasEdited =
      JSON.stringify(dto.soap) !== JSON.stringify(draft.soapJson) ||
      JSON.stringify(dto.clientSummary) !== JSON.stringify(draft.clientSummary);

    await this.repoFactory.for(SoapDraftEntity, schema).update(draftId, {
      soapJson: dto.soap,
      clientSummary: dto.clientSummary,
      status: 'approved',
      approvedBy: vet.sub,
      approvedAt: new Date(),
      wasEdited,
      portalPublished: dto.publishToPortal,
    });

    this.logger.log(`SOAP draft ${draftId} approved by vet ${vet.sub}`);

    return this.repoFactory
      .for(SoapDraftEntity, schema)
      .findOne({ where: { id: draftId } }) as Promise<SoapDraftEntity>;
  }

  // ── List drafts for a vet or pet ─────────────────────────────────────

  async list(
    schema: string,
    vetId: string,
    petId?: string,
  ): Promise<SoapDraftEntity[]> {
    return this.repoFactory.for(SoapDraftEntity, schema).find({
      where: {
        veterinarianId: vetId,
        ...(petId && { petId }),
      },
      order: { createdAt: 'DESC' },
      take: 50,
    });
  }

  // ── Private helpers ───────────────────────────────────────────────────

  private async transcribeMedia(
    mediaUrl: string,
    inputType: 'audio' | 'video',
  ): Promise<string> {
    if (!this.deepgram) {
      throw new BadRequestException('Transcription service not configured');
    }

    const deepgramModel =
      this.configService.get<string>('DEEPGRAM_MODEL') ?? 'nova-2-medical';

    this.logger.log(`Transcribing ${inputType} from ${mediaUrl}`);

    try {
      const { result } = await this.deepgram.listen.prerecorded.transcribeUrl(
        { url: mediaUrl },
        {
          model: deepgramModel,
          smart_format: true,
          diarize: true,
          punctuate: true,
          paragraphs: true,
          utterances: true,
          language: 'en-US',
        },
      );

      const utterances = result?.results?.utterances ?? [];
      if (utterances.length > 0) {
        // Build diarized transcript: "Speaker 0: text\nSpeaker 1: text"
        return utterances
          .map((u: any) => `Speaker ${u.speaker}: ${u.transcript}`)
          .join('\n');
      }

      // Fallback to plain transcript
      return (
        result?.results?.channels?.[0]?.alternatives?.[0]?.transcript ?? ''
      );
    } catch (err) {
      this.logger.error(
        `Deepgram transcription failed: ${(err as Error).message}`,
      );

      // Fallback to Whisper via OpenAI
      this.logger.warn('Falling back to OpenAI Whisper transcription');
      return this.transcribeWithWhisper(mediaUrl);
    }
  }

  private async transcribeWithWhisper(mediaUrl: string): Promise<string> {
    const tmpPath = await this.audioProc.downloadToTemp(mediaUrl);
    try {
      const { createReadStream } = require('fs');
      const OpenAI = require('openai');
      const openai = new OpenAI({
        apiKey: this.configService.get('OPENAI_API_KEY'),
      });

      const transcription = await openai.audio.transcriptions.create({
        file: createReadStream(tmpPath),
        model: 'whisper-1',
      });

      return transcription.text;
    } finally {
      this.audioProc.cleanupFiles(tmpPath);
    }
  }

  private async buildPatientContext(
    schema: string,
    petId: string,
  ): Promise<string> {
    const rows: any[] = await this.tenantConn.runInTenantSchema(schema, (em) =>
      em.query(
        `SELECT
           p.name, p.species, p.breed, p.date_of_birth, p.gender,
           p.weight_kg, p.is_neutered, p.notes,
           (SELECT json_agg(json_build_object(
              'date', mr.visit_date, 'type', mr.record_type,
              'diagnosis', mr.diagnosis
           ) ORDER BY mr.visit_date DESC) FROM medical_records mr
            WHERE mr.pet_id = p.id AND mr.deleted_at IS NULL LIMIT 5
           ) AS recent_records,
           (SELECT json_agg(json_build_object(
              'name', rx.medication_name, 'dosage', rx.dosage,
              'frequency', rx.frequency, 'status', rx.status
           )) FROM prescriptions rx
            WHERE rx.pet_id = p.id AND rx.status = 'active' AND rx.deleted_at IS NULL
           ) AS active_meds
         FROM pets p
         WHERE p.id = $1`,
        [petId],
      ),
    );

    if (!rows.length) return 'Patient not found';
    const p = rows[0];

    const age = p.date_of_birth
      ? `${Math.floor((Date.now() - new Date(p.date_of_birth).getTime()) / (365.25 * 24 * 3600 * 1000))} years`
      : 'Unknown age';

    const meds =
      (p.active_meds ?? [])
        .map((m: any) => `${m.name} ${m.dosage} ${m.frequency}`)
        .join(', ') || 'None';

    const history =
      (p.recent_records ?? [])
        .map(
          (r: any) =>
            `${r.date?.split('T')[0]} - ${r.type}${r.diagnosis ? `: ${r.diagnosis}` : ''}`,
        )
        .join('\n  ') || 'No recent records';

    return `
Name: ${p.name}
Species: ${p.species} | Breed: ${p.breed ?? 'Unknown'} | Age: ${age}
Gender: ${p.gender} | Weight: ${p.weight_kg ? `${p.weight_kg}kg` : 'Not recorded'}
Neutered: ${p.is_neutered === true ? 'Yes' : p.is_neutered === false ? 'No' : 'Unknown'}
Active medications: ${meds}
Known notes: ${p.notes ?? 'None'}
Recent visit history:
  ${history}
    `.trim();
  }
}
