import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateTenantOwnerDto } from './create-tenant.dto';

export class RetryProvisioningDto {
  @ApiPropertyOptional({
    type: () => CreateTenantOwnerDto,
    description:
      'Owner credentials — only required if the owner user was not created in the failed attempt.',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateTenantOwnerDto)
  owner?: CreateTenantOwnerDto;
}
