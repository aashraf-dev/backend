import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { PaginationDto } from '../../../../shared/dto/pagination.dto';
import {
  UserType,
  PLATFORM_USER_TYPES,
} from '../../../../shared/enums/user-type.enum';

export enum PlatformUserSortBy {
  EMAIL = 'email',
  CREATED_AT = 'createdAt',
  LAST_LOGIN = 'lastLoginAt',
  FIRST_NAME = 'firstName',
}

export class PlatformUsersQueryDto extends PaginationDto {
  @ApiPropertyOptional({
    description: 'Search by email, first name, or last name',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  @Transform(({ value }: { value: string }) => value?.trim())
  search?: string;

  @ApiPropertyOptional({ enum: PLATFORM_USER_TYPES })
  @IsOptional()
  @IsEnum(UserType)
  userType?: UserType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }: { value: string }) => value === 'true')
  isActive?: boolean;

  @ApiPropertyOptional({
    enum: PlatformUserSortBy,
    default: PlatformUserSortBy.CREATED_AT,
  })
  @IsOptional()
  @IsEnum(PlatformUserSortBy)
  sortBy?: PlatformUserSortBy = PlatformUserSortBy.CREATED_AT;
}
