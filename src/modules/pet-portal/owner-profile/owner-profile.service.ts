import { Injectable, NotFoundException } from '@nestjs/common';

import { TenantConnectionService } from '../../../database/tenant-connection.service';
import { TenantRepositoryFactory } from '../../../database/tenant-repository';
import { UserEntity } from '../../../database/entities/tenant/user.entity';
import { OwnerProfileEntity } from '../../../database/entities/tenant/owner-profile.entity';
import { RedisService } from '../../../shared/redis/redis.service';
import { CacheKeys } from '../../../shared/constants/cache-keys.constant';
import { IJwtPayload } from '../../../shared/interfaces/jwt-payload.interface';
import { PortalContextService } from '../common/portal-context.service';
import { UpdateOwnerProfileDto } from './dto';

export interface IFullOwnerProfile {
  id: string;
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  secondaryPhone: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  postalCode: string | null;
  country: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  marketingConsent: boolean;
  isEmailVerified: boolean;
  mfaEnabled: boolean;
}

@Injectable()
export class OwnerProfileService {
  constructor(
    private readonly portalCtx: PortalContextService,
    private readonly tenantConn: TenantConnectionService,
    private readonly repoFactory: TenantRepositoryFactory,
    private readonly redis: RedisService,
  ) {}

  async getMyProfile(currentUser: IJwtPayload): Promise<IFullOwnerProfile> {
    const schema = this.portalCtx.getSchema();

    // Check cache first
    const cacheKey = CacheKeys.CURRENT_USER(currentUser.sub, schema);
    const cached = await this.redis.getJson<IFullOwnerProfile>(cacheKey);
    if (cached) return cached;

    const rows: any[] = await this.tenantConn.runInTenantSchema(schema, (em) =>
      em.query(
        `SELECT
           op.id,
           op.user_id,
           u.email,
           u.first_name,
           u.last_name,
           u.is_email_verified,
           u.mfa_enabled,
           op.phone,
           op.secondary_phone,
           op.address_line1,
           op.address_line2,
           op.city,
           op.postal_code,
           op.country,
           op.emergency_contact_name,
           op.emergency_contact_phone,
           op.marketing_consent
         FROM owner_profiles op
         INNER JOIN users u ON u.id = op.user_id
         WHERE op.user_id = $1`,
        [currentUser.sub],
      ),
    );

    if (!rows.length) {
      throw new NotFoundException('Owner profile not found');
    }

    const r = rows[0];
    const profile: IFullOwnerProfile = {
      id: r.id,
      userId: r.user_id,
      email: r.email,
      firstName: r.first_name,
      lastName: r.last_name,
      isEmailVerified: r.is_email_verified,
      mfaEnabled: r.mfa_enabled,
      phone: r.phone,
      secondaryPhone: r.secondary_phone,
      addressLine1: r.address_line1,
      addressLine2: r.address_line2,
      city: r.city,
      postalCode: r.postal_code,
      country: r.country,
      emergencyContactName: r.emergency_contact_name,
      emergencyContactPhone: r.emergency_contact_phone,
      marketingConsent: r.marketing_consent,
    };

    // Cache for 5 min
    await this.redis.setJson(cacheKey, profile, 300);

    return profile;
  }

  async updateMyProfile(
    currentUser: IJwtPayload,
    dto: UpdateOwnerProfileDto,
  ): Promise<IFullOwnerProfile> {
    const schema = this.portalCtx.getSchema();

    const ownerProfile = await this.portalCtx.getOwnerProfile(currentUser.sub);

    // Update user name fields on UserEntity
    const userUpdates: Partial<UserEntity> = {};
    if (dto.firstName !== undefined) userUpdates.firstName = dto.firstName;
    if (dto.lastName !== undefined) userUpdates.lastName = dto.lastName;

    if (Object.keys(userUpdates).length > 0) {
      await this.repoFactory
        .for(UserEntity, schema)
        .update(currentUser.sub, userUpdates);
    }

    // Update owner profile fields
    const profileUpdates: Partial<OwnerProfileEntity> = {};
    if (dto.phone !== undefined) profileUpdates.phone = dto.phone;
    if (dto.secondaryPhone !== undefined)
      profileUpdates.secondaryPhone = dto.secondaryPhone;
    if (dto.addressLine1 !== undefined)
      profileUpdates.addressLine1 = dto.addressLine1;
    if (dto.addressLine2 !== undefined)
      profileUpdates.addressLine2 = dto.addressLine2;
    if (dto.city !== undefined) profileUpdates.city = dto.city;
    if (dto.postalCode !== undefined)
      profileUpdates.postalCode = dto.postalCode;
    if (dto.country !== undefined) profileUpdates.country = dto.country;
    if (dto.emergencyContactName !== undefined)
      profileUpdates.emergencyContactName = dto.emergencyContactName;
    if (dto.emergencyContactPhone !== undefined)
      profileUpdates.emergencyContactPhone = dto.emergencyContactPhone;
    if (dto.marketingConsent !== undefined)
      profileUpdates.marketingConsent = dto.marketingConsent;

    if (Object.keys(profileUpdates).length > 0) {
      await this.repoFactory
        .for(OwnerProfileEntity, schema)
        .update(ownerProfile.id, profileUpdates);
    }

    // Invalidate cache
    await this.redis.del(CacheKeys.CURRENT_USER(currentUser.sub, schema));

    return this.getMyProfile(currentUser);
  }
}
