import { ApiProperty } from '@nestjs/swagger';
import { ArrayMinSize, IsUUID } from 'class-validator';

export class AssignPermissionsDto {
  @ApiProperty({
    type: [String],
    description: 'Permission UUIDs to assign/revoke in bulk',
  })
  @IsUUID('all', { each: true })
  @ArrayMinSize(1)
  permissionIds: string[];
}
