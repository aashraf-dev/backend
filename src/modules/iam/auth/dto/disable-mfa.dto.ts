import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class DisableMfaDto {
  @ApiProperty({ description: 'Current account password to confirm identity' })
  @IsString()
  @IsNotEmpty()
  password!: string;
}
