import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import {
  TenantStatus,
  SubscriptionPlan,
} from '../../../../database/entities/platform/tenant.entity';
import { PaginationDto } from '../../../../shared/dto/pagination.dto';

export enum TenantSortBy {
  NAME = 'name',
  CREATED_AT = 'createdAt',
  STATUS = 'status',
  LAST_ACTIVE = 'lastActiveAt',
  SUBSCRIPTION = 'subscriptionPlan',
}

export class TenantQueryDto extends PaginationDto {
  @ApiPropertyOptional({
    description: 'Full-text search across name, slug, and contact email',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  @Transform(({ value }: { value: string }) => value?.trim())
  search?: string;

  @ApiPropertyOptional({ enum: TenantStatus })
  @IsOptional()
  @IsEnum(TenantStatus)
  status?: TenantStatus;

  @ApiPropertyOptional({ enum: SubscriptionPlan })
  @IsOptional()
  @IsEnum(SubscriptionPlan)
  subscriptionPlan?: SubscriptionPlan;

  @ApiPropertyOptional({ enum: TenantSortBy, default: TenantSortBy.CREATED_AT })
  @IsOptional()
  @IsEnum(TenantSortBy)
  sortBy?: TenantSortBy = TenantSortBy.CREATED_AT;
}
