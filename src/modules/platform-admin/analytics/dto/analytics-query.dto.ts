import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class AnalyticsQueryDto {
  @ApiPropertyOptional({
    default: 12,
    minimum: 1,
    maximum: 24,
    description: 'Number of past months to include in trend data',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(24)
  @Transform(({ value }: { value: string }) => parseInt(value, 10))
  months: number = 12;
}
