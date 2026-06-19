import {
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { IClsStore } from '../../../core/context/request-context';
import { AppContext } from '../../../shared/enums/app-context.enum';
import { IJwtPayload } from '../../../shared/interfaces/jwt-payload.interface';
import { TenantRepositoryFactory } from '../../../database/tenant-repository';
import { OwnerProfileEntity } from '../../../database/entities/tenant/owner-profile.entity';
import { PetEntity } from '../../../database/entities/tenant/pet.entity';

/**
 * Portal-scoped context helper.
 *
 * Every portal service gets the schema and the calling owner's profile ID
 * from here rather than re-querying. The core invariant it enforces:
 * a pet owner can ONLY see data that belongs to them.
 */
@Injectable()
export class PortalContextService {
  constructor(
    private readonly cls: ClsService<IClsStore>,
    private readonly repoFactory: TenantRepositoryFactory,
  ) {}

  getSchema(): string {
    const schema = this.cls.get('TENANT_SCHEMA');
    if (!schema) {
      throw new InternalServerErrorException(
        'No tenant schema in request context — check middleware configuration',
      );
    }
    return schema;
  }

  getTenantId(): string {
    const id = this.cls.get('TENANT_ID');
    if (!id)
      throw new InternalServerErrorException('No tenant ID in request context');
    return id;
  }

  getAppContext(): AppContext {
    return this.cls.get('APP_CONTEXT') ?? AppContext.PORTAL;
  }

  /**
   * Resolve the OwnerProfileEntity for the authenticated pet owner.
   * Throws 404 if the user exists but has no profile (data integrity issue).
   */
  async getOwnerProfile(userId: string): Promise<OwnerProfileEntity> {
    const schema = this.getSchema();
    const profile = await this.repoFactory
      .for(OwnerProfileEntity, schema)
      .findOne({ where: { userId } });

    if (!profile) {
      throw new NotFoundException(
        'Owner profile not found. Please complete your registration.',
      );
    }

    return profile;
  }

  /**
   * Verify a pet belongs to the authenticated owner before any operation.
   * Throws 403 (not 404) to prevent pet ID enumeration.
   */
  async assertPetOwnership(
    petId: string,
    user: IJwtPayload,
  ): Promise<PetEntity> {
    const schema = this.getSchema();

    const ownerProfile = await this.getOwnerProfile(user.sub);

    const pet = await this.repoFactory
      .for(PetEntity, schema)
      .findOne({ where: { id: petId, ownerId: ownerProfile.id } });

    if (!pet) {
      throw new ForbiddenException(
        'Pet not found or does not belong to your account',
      );
    }

    return pet;
  }
}
