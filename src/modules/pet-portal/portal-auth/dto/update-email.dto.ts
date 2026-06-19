import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateEmailDto {
  @ApiProperty({ example: 'newemail@example.com' })
  @IsEmail()
  @MaxLength(320)
  @Transform(({ value }: { value: string }) => value?.toLowerCase().trim())
  newEmail: string;

  @ApiProperty({ description: 'Current password to confirm identity' })
  @IsString()
  @IsNotEmpty()
  currentPassword: string;
}
