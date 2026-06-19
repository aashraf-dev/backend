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

export class BookAppointmentDto {
  @ApiProperty({ description: "Your pet's UUID" })
  @IsUUID()
  petId: string;

  @ApiProperty({
    description:
      'Veterinarian UUID — use GET /portal/clinic/vets to list available vets',
  })
  @IsUUID()
  vetId: string;

  @ApiPropertyOptional({ description: 'Clinic service UUID' })
  @IsOptional()
  @IsUUID()
  serviceId?: string;

  @ApiProperty({
    example: '2025-11-20T10:00:00Z',
    description: 'Requested appointment time in UTC',
  })
  @IsDateString()
  scheduledAt: string;

  @ApiPropertyOptional({ description: 'Brief reason for visit' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
