import { IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class PortalCancelAppointmentDto {
  @ApiPropertyOptional({ example: 'Pet is feeling better' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
