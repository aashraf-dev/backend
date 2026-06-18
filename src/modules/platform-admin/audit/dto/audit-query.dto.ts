import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { PaginationDto } from '../../../../shared/dto/pagination.dto';
import { AppContext } from '../../../../shared/enums/app-context.enum';

export class AuditQueryDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Filter by actor (platform user) UUID' })
  @IsOptional()
  @IsUUID()
  actorId?: string;

  @ApiPropertyOptional({ description: 'Filter by tenant UUID' })
  @IsOptional()
  @IsUUID()
  tenantId?: string;

  @ApiPropertyOptional({ enum: AppContext })
  @IsOptional()
  @IsEnum(AppContext)
  appContext?: AppContext;

  @ApiPropertyOptional({
    example: 'tenant.',
    description: 'Partial match on action string e.g. "tenant." or "POST"',
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  action?: string;

  @ApiPropertyOptional({
    example: 'tenant',
    description: 'Filter by resource type e.g. "tenant", "platform_user"',
  })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  resourceType?: string;

  @ApiPropertyOptional({ example: '2025-01-01T00:00:00Z' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ example: '2025-12-31T23:59:59Z' })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
