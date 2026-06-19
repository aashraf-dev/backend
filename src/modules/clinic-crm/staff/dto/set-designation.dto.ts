import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

export class SetDesignationDto {
  @ApiPropertyOptional({ description: 'Designation UUID — null to clear' })
  @IsOptional()
  @IsUUID()
  designationId: string | null;
}
