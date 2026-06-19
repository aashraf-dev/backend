import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  UserType,
  CLINIC_STAFF_TYPES,
} from '../../../../shared/enums/user-type.enum';
import { IsStrongPassword } from '../../../../shared/validators';

export class CreateStaffDto {
  @ApiProperty({ example: 'dr.jones@happypaws.com' })
  @IsEmail()
  @MaxLength(320)
  @Transform(({ value }: { value: string }) => value?.toLowerCase().trim())
  email: string;

  @ApiProperty({ example: 'Rachel' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Transform(({ value }: { value: string }) => value?.trim())
  firstName: string;

  @ApiProperty({ example: 'Jones' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Transform(({ value }: { value: string }) => value?.trim())
  lastName: string;

  @ApiProperty({
    enum: CLINIC_STAFF_TYPES,
    description:
      'Must be a clinic-level staff type — not pet_owner or platform types',
  })
  @IsEnum(UserType)
  userType: UserType;

  @ApiProperty({
    description: 'Temporary password — staff should change on first login',
  })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  @IsStrongPassword()
  password: string;

  @ApiPropertyOptional({ description: 'Designation UUID from this clinic' })
  @IsOptional()
  @IsUUID()
  designationId?: string;

  @ApiPropertyOptional({
    type: [String],
    description: 'Role UUIDs to assign immediately',
  })
  @IsOptional()
  @IsUUID('all', { each: true })
  roleIds?: string[];

  @ApiPropertyOptional({
    type: [String],
    description: 'Department UUIDs to assign',
  })
  @IsOptional()
  @IsUUID('all', { each: true })
  departmentIds?: string[];

  @ApiPropertyOptional({
    description: 'Mark the primary department (must be in departmentIds)',
  })
  @IsOptional()
  @IsUUID()
  primaryDepartmentId?: string;
}
