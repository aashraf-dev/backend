import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsUUID } from 'class-validator';

export class AssignDepartmentDto {
  @ApiProperty({ description: 'Department UUID' })
  @IsUUID()
  departmentId: string;

  @ApiPropertyOptional({
    default: false,
    description: 'Mark as primary department',
  })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}
