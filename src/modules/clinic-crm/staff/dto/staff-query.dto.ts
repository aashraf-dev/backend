import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { PaginationDto } from '../../../../shared/dto/pagination.dto';
import {
  UserType,
  CLINIC_STAFF_TYPES,
} from '../../../../shared/enums/user-type.enum';

export enum StaffSortBy {
  FIRST_NAME = 'firstName',
  LAST_NAME = 'lastName',
  EMAIL = 'email',
  CREATED_AT = 'createdAt',
  LAST_LOGIN = 'lastLoginAt',
}

export class StaffQueryDto extends PaginationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  @Transform(({ value }: { value: string }) => value?.trim())
  search?: string;

  @ApiPropertyOptional({ enum: CLINIC_STAFF_TYPES })
  @IsOptional()
  @IsEnum(UserType)
  userType?: UserType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  designationId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }: { value: string }) => value === 'true')
  isActive?: boolean;

  @ApiPropertyOptional({ enum: StaffSortBy, default: StaffSortBy.FIRST_NAME })
  @IsOptional()
  @IsEnum(StaffSortBy)
  sortBy?: StaffSortBy = StaffSortBy.FIRST_NAME;
}
