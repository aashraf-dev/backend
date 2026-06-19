import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { PaginationDto } from '../../../../shared/dto/pagination.dto';
import { AppointmentStatus } from '../../../../database/entities/tenant/appointment.entity';

export class PortalAppointmentQueryDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Filter by a specific pet UUID' })
  @IsOptional()
  @IsUUID()
  petId?: string;

  @ApiPropertyOptional({ enum: AppointmentStatus })
  @IsOptional()
  @IsEnum(AppointmentStatus)
  status?: AppointmentStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
