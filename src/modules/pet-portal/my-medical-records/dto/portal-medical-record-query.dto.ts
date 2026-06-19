import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { PaginationDto } from '../../../../shared/dto/pagination.dto';
import { MedicalRecordType } from '../../../../database/entities/tenant/medical-record.entity';

export class PortalMedicalRecordQueryDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Filter by a specific pet UUID' })
  @IsOptional()
  @IsUUID()
  petId?: string;

  @ApiPropertyOptional({ enum: MedicalRecordType })
  @IsOptional()
  @IsEnum(MedicalRecordType)
  recordType?: MedicalRecordType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
