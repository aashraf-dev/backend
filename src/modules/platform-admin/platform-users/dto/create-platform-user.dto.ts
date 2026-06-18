import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import {
  UserType,
  PLATFORM_USER_TYPES,
} from '../../../../shared/enums/user-type.enum';
import { IsStrongPassword } from '../../../../shared/validators';

export class CreatePlatformUserDto {
  @ApiProperty({ example: 'support@vetos.com' })
  @IsEmail()
  @MaxLength(320)
  @Transform(({ value }: { value: string }) => value?.toLowerCase().trim())
  email: string;

  @ApiProperty({ example: 'John' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Transform(({ value }: { value: string }) => value?.trim())
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Transform(({ value }: { value: string }) => value?.trim())
  lastName: string;

  @ApiProperty({
    enum: PLATFORM_USER_TYPES,
    description: 'Only platform-level user types are allowed here',
  })
  @IsEnum(UserType)
  userType: UserType;

  @ApiProperty({
    description: 'Initial password — user should change on first login',
  })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  @IsStrongPassword()
  password: string;
}
