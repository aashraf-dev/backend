import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SoapInput } from '../../entities/tenant/soap-draft.entity';

export class GenerateSoapDto {
  @ApiProperty({ description: 'Patient (pet) UUID' })
  @IsUUID()
  petId: string;

  @ApiPropertyOptional({ description: 'Link to specific appointment' })
  @IsOptional()
  @IsUUID()
  appointmentId?: string;

  @ApiProperty({ enum: ['text', 'audio', 'video'] })
  @IsEnum(['text', 'audio', 'video'])
  inputType: SoapInput;

  @ApiPropertyOptional({
    description: 'For text input: consultation notes typed by the vet',
  })
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  rawText?: string;

  @ApiPropertyOptional({
    description: 'For audio/video input: Azure Blob URL of the recording',
  })
  @IsOptional()
  @IsString()
  mediaUrl?: string;
}

export class ApproveSoapDto {
  @ApiProperty({ description: 'Final SOAP JSON after optional vet edits' })
  soap: {
    subjective: string;
    objective: string;
    assessment: string;
    plan: string;
  };

  @ApiProperty({ description: 'Final client summary after optional vet edits' })
  clientSummary: {
    whatHappenedToday: string;
    whatWeFound: string;
    carePlan: string;
    nextSteps: string;
  };

  @ApiProperty({ description: 'Whether to publish summary to pet portal' })
  publishToPortal: boolean;
}
