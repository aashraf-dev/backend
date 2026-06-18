import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional } from 'class-validator';
import { SubscriptionPlan } from '../../../../database/entities/platform/tenant.entity';

export class UpdateSubscriptionDto {
  @ApiProperty({ enum: SubscriptionPlan })
  @IsEnum(SubscriptionPlan)
  plan: SubscriptionPlan;

  @ApiPropertyOptional({
    example: '2026-12-31T23:59:59Z',
    description:
      'Subscription expiry date. Null = no expiry (lifetime/enterprise).',
  })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
