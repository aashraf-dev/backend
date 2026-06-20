import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { AiProviderService } from '../core/ai-provider.service';
import { AiCostGuardService } from '../core/ai-cost-guard.service';
import { TenantConnectionService } from '../../../database/tenant-connection.service';
import { TenantRepositoryFactory } from '../../../database/tenant-repository';
import {
  LabInterpretationEntity,
  IAbnormalValue,
} from '../entities/tenant/lab-interpretation.entity';
import { MedicalRecordEntity } from '../../../database/entities/tenant/medical-record.entity';

const LAB_SYSTEM_PROMPT = `You are a veterinary diagnostic AI.
Analyze the provided lab results for a veterinary patient.

RULES:
1. Identify ALL abnormal values with their reference ranges.
2. Classify severity: normal | mild | moderate | significant
3. Write a CLINICAL summary for the veterinarian (professional, concise).
4. Write a PLAIN LANGUAGE summary for the pet owner (Grade 6-8 reading level, reassuring tone, avoid medical jargon).
5. NEVER suggest specific treatments or medications.
6. NEVER provide a definitive diagnosis — only flag abnormalities and suggest follow-up.
7. Be conservative with severity — when in doubt, classify lower.

Respond ONLY with valid JSON:
{
  "abnormalValues": [
    {
      "parameter": "BUN",
      "value": "45",
      "unit": "mg/dL",
      "referenceRange": "7-25 mg/dL",
      "severity": "moderate",
      "direction": "high",
      "note": "Elevated blood urea nitrogen may indicate kidney stress"
    }
  ],
  "overallSeverity": "normal|mild|moderate|significant",
  "clinicalSummary": "...",
  "plainLanguageSummary": "...",
  "recommendedActions": ["Schedule recheck in 2 weeks", "Hydration assessment"],
  "confidenceScore": 0.9
}`;

@Injectable()
export class LabInterpretationService {
  private readonly logger = new Logger(LabInterpretationService.name);

  constructor(
    private readonly ai: AiProviderService,
    private readonly costGuard: AiCostGuardService,
    private readonly tenantConn: TenantConnectionService,
    private readonly repoFactory: TenantRepositoryFactory,
  ) {}

  async interpret(
    schema: string,
    tenantId: string,
    medicalRecordId: string,
    requestedById: string,
  ): Promise<LabInterpretationEntity> {
    await this.costGuard.assertQuotaAvailable(tenantId);

    // Fetch the medical record
    const record = await this.repoFactory
      .for(MedicalRecordEntity, schema)
      .findOne({ where: { id: medicalRecordId } });

    if (!record)
      throw new NotFoundException(
        `Medical record ${medicalRecordId} not found`,
      );
    if (record.recordType !== 'lab_result') {
      throw new Error('Lab interpretation only applies to lab_result records');
    }

    // Build content string from the record's fields
    const labContent = [
      record.chiefComplaint ? `Chief complaint: ${record.chiefComplaint}` : '',
      record.diagnosis ? `Clinician notes: ${record.diagnosis}` : '',
      record.treatment ? `Treatment notes: ${record.treatment}` : '',
      record.notes ? `Additional notes: ${record.notes}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    if (!labContent.trim()) {
      throw new Error('No lab result content found in medical record');
    }

    // Get patient context
    const petRows: any[] = await this.tenantConn.runInTenantSchema(
      schema,
      (em) =>
        em.query(
          `SELECT p.name, p.species, p.breed, p.date_of_birth, p.gender, p.weight_kg
         FROM pets p WHERE p.id = $1`,
          [record.petId],
        ),
    );

    const pet = petRows[0];
    const patientStr = pet
      ? `Patient: ${pet.name} (${pet.species}, ${pet.breed ?? ''}, ${pet.gender})`
      : 'Patient: Unknown';

    const aiResponse = await this.ai.complete({
      messages: [
        { role: 'system', content: LAB_SYSTEM_PROMPT },
        {
          role: 'user',
          content: `${patientStr}\n\nLAB RESULTS:\n${labContent}`,
        },
      ],
      temperature: 0.1,
      maxTokens: 1500,
      jsonMode: true,
    });

    await this.costGuard.recordUsage(
      tenantId,
      requestedById,
      'lab_interpretation',
      aiResponse,
    );

    let parsed: any;
    try {
      parsed = this.ai.parseJson<any>(aiResponse.content);
    } catch {
      throw new Error('AI failed to parse lab results. Please try again.');
    }

    // Upsert interpretation (one per record)
    const existing = await this.repoFactory
      .for(LabInterpretationEntity, schema)
      .findOne({ where: { medicalRecordId } });

    const data = {
      medicalRecordId,
      petId: record.petId,
      abnormalValues: parsed.abnormalValues ?? [],
      overallSeverity: parsed.overallSeverity ?? 'normal',
      clinicalSummary: parsed.clinicalSummary ?? null,
      plainLanguageSummary: parsed.plainLanguageSummary ?? null,
      recommendedActions: parsed.recommendedActions ?? [],
      confidenceScore: parsed.confidenceScore ?? null,
      vetApproved: false,
      portalPublished: false,
    };

    if (existing) {
      await this.repoFactory
        .for(LabInterpretationEntity, schema)
        .update(existing.id, data);
      return this.repoFactory.for(LabInterpretationEntity, schema).findOne({
        where: { id: existing.id },
      }) as Promise<LabInterpretationEntity>;
    }

    return this.repoFactory.for(LabInterpretationEntity, schema).save(data);
  }

  async approve(
    schema: string,
    interpretationId: string,
    vetId: string,
    publishToPortal: boolean,
  ): Promise<LabInterpretationEntity> {
    await this.repoFactory
      .for(LabInterpretationEntity, schema)
      .update(interpretationId, {
        vetApproved: true,
        approvedBy: vetId,
        portalPublished: publishToPortal,
      });

    return this.repoFactory.for(LabInterpretationEntity, schema).findOne({
      where: { id: interpretationId },
    }) as Promise<LabInterpretationEntity>;
  }

  async getForRecord(
    schema: string,
    medicalRecordId: string,
  ): Promise<LabInterpretationEntity | null> {
    return this.repoFactory
      .for(LabInterpretationEntity, schema)
      .findOne({ where: { medicalRecordId } });
  }
}
