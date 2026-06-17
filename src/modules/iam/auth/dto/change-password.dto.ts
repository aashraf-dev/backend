import { IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import {
  IsStrongPassword,
  MatchesProperty,
} from '../../../../shared/validators';

export class ChangePasswordDto {
  @ApiProperty()
  @IsString()
  @MinLength(1, { message: 'Current password is required' })
  currentPassword!: string;

  @ApiProperty({ minLength: 8, maxLength: 128 })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  @IsStrongPassword()
  newPassword!: string;

  @ApiProperty()
  @IsString()
  @MatchesProperty('newPassword', { message: 'Passwords do not match' })
  confirmPassword!: string;
}
