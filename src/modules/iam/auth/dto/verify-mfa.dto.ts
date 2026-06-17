import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyMfaDto {
  @ApiProperty({
    description: 'Short-lived MFA pending token from login response',
  })
  @IsString()
  @IsNotEmpty()
  mfaToken!: string;

  @ApiProperty({
    description: '6-digit TOTP code or 8-character recovery code',
  })
  @IsString()
  @IsNotEmpty()
  code!: string;
}
