import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CancelAppointmentDto {
  @ApiPropertyOptional({ example: 'Owner called to reschedule' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
