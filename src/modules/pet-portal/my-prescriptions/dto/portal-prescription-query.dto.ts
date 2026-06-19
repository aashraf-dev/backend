import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { PaginationDto } from '../../../../shared/dto/pagination.dto';
import { PrescriptionStatus } from '../../../../database/entities/tenant/prescription.entity';

export class PortalPrescriptionQueryDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Filter by a specific pet UUID' })
  @IsOptional()
  @IsUUID()
  petId?: string;

  @ApiPropertyOptional({
    enum: PrescriptionStatus,
    description: 'Filter by status — leave empty to see all',
  })
  @IsOptional()
  @IsEnum(PrescriptionStatus)
  status?: PrescriptionStatus;
}
