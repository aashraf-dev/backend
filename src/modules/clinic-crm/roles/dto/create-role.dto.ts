import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateRoleDto {
  @ApiProperty({ example: 'Lead Surgeon' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  @Transform(({ value }: { value: string }) =>
    value?.trim().toLowerCase().replace(/\s+/g, '_'),
  )
  name: string;

  @ApiProperty({ example: 'Lead Surgeon' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  @Transform(({ value }: { value: string }) => value?.trim())
  displayName: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({
    type: [String],
    description: 'Permission UUIDs to assign immediately',
  })
  @IsOptional()
  @IsUUID('all', { each: true })
  permissionIds?: string[];
}
