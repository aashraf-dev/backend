import { ApiPropertyOptional } from '@nestjs/swagger';
import { ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateTenantOwnerDto } from './create-tenant.dto';

export class RetryProvisioningDto {
  @ApiPropertyOptional({
    type: () => CreateTenantOwnerDto,
  })
  @ValidateNested()
  @Type(() => CreateTenantOwnerDto)
  owner?: CreateTenantOwnerDto;
}
