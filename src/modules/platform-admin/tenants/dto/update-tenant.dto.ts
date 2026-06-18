import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateTenantDto } from './create-tenant.dto';

/**
 * Slug and owner cannot be changed after creation.
 * Slug is identity-critical (tied to subdomain + schema name).
 * Owner management is handled through the CRM user management endpoints.
 */
export class UpdateTenantDto extends PartialType(
  OmitType(CreateTenantDto, ['slug', 'owner', 'subscriptionPlan'] as const),
) {}
