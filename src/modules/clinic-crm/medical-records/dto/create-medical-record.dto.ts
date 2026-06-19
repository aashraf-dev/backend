import {
  IsArray,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MedicalRecordType } from '../../../../database/entities/tenant/medical-record.entity';

export class CreateMedicalRecordDto {
  @ApiProperty()
  @IsUUID()
  petId: string;

  @ApiProperty({ description: 'Attending veterinarian UUID' })
  @IsUUID()
  attendingVetId: string;

  @ApiProperty({ enum: MedicalRecordType })
  @IsEnum(MedicalRecordType)
  recordType: MedicalRecordType;

  @ApiProperty({ example: '2025-11-14T10:00:00Z' })
  @IsDateString()
  visitDate: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  chiefComplaint?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  diagnosis?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  treatment?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ example: 33.5, description: 'Weight at visit in kg' })
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  @Max(999)
  weightAtVisitKg?: number;

  @ApiPropertyOptional({ example: 38.4, description: 'Temperature in Celsius' })
  @IsOptional()
  @IsNumber()
  @Min(30)
  @Max(44)
  temperatureCelsius?: number;

  @ApiPropertyOptional({
    type: [String],
    description: 'File URLs (X-rays, lab reports)',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachments?: string[];

  @ApiPropertyOptional({
    example: '2025-12-14',
    description: 'Recommended follow-up date',
  })
  @IsOptional()
  @IsDateString()
  followUpDate?: string;
}
