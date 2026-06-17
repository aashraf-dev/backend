import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import {
  IsStrongPassword,
  MatchesProperty,
} from '../../../../shared/validators';

export class ResetPasswordDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  token!: string;

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
