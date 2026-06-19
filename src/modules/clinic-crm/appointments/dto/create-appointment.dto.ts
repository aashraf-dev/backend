import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAppointmentDto {
  @ApiProperty({ description: 'Pet (patient) UUID' })
  @IsUUID()
  petId: string;

  @ApiProperty({ description: 'Assigned veterinarian UUID' })
  @IsUUID()
  vetId: string;

  @ApiPropertyOptional({ description: 'Clinic service UUID' })
  @IsOptional()
  @IsUUID()
  serviceId?: string;

  @ApiProperty({ example: '2025-11-20T09:00:00Z' })
  @IsDateString()
  scheduledAt: string;

  @ApiPropertyOptional({ default: 30, minimum: 5, maximum: 480 })
  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(480)
  durationMinutes?: number;

  @ApiPropertyOptional({ example: 'Annual wellness exam' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
