import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { OverrideType } from '../../../../database/entities/tenant/user-permission-override.entity';

export class AddPermissionOverrideDto {
  @ApiProperty({ description: 'Permission UUID' })
  @IsUUID()
  permissionId: string;

  @ApiProperty({
    enum: OverrideType,
    description: '"grant" adds the permission; "deny" removes it',
  })
  @IsEnum(OverrideType)
  type: OverrideType;

  @ApiPropertyOptional({ description: 'Why this override was applied' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;

  @ApiPropertyOptional({
    example: '2025-12-31T23:59:59Z',
    description: 'Optional expiry — leave null for permanent',
  })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
