import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsDateString, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { PaginationDto } from '../../../../shared/dto/pagination.dto';
import { AppointmentStatus } from '../../../../database/entities/tenant/appointment.entity';

export class AppointmentQueryDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Filter by pet UUID' })
  @IsOptional()
  @IsUUID()
  petId?: string;

  @ApiPropertyOptional({ description: 'Filter by vet UUID' })
  @IsOptional()
  @IsUUID()
  vetId?: string;

  @ApiPropertyOptional({ enum: AppointmentStatus })
  @IsOptional()
  @IsEnum(AppointmentStatus)
  status?: AppointmentStatus;

  @ApiPropertyOptional({ example: '2025-11-01T00:00:00Z' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ example: '2025-11-30T23:59:59Z' })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
