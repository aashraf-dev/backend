import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AppContext } from '../../../../shared/enums/app-context.enum';

export class SendMessageDto {
  @ApiProperty({ example: 'Is Dr. Wilson available next Monday?' })
  @IsString()
  @MaxLength(2000)
  message: string;

  @ApiPropertyOptional({
    description: 'Existing conversation UUID to continue',
  })
  @IsOptional()
  @IsUUID()
  conversationId?: string;
}
