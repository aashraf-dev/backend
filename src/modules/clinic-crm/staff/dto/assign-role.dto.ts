import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class AssignRoleDto {
  @ApiProperty({ description: 'Role UUID to assign' })
  @IsUUID()
  roleId: string;
}
