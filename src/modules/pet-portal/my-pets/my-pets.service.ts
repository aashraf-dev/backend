import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { TenantRepositoryFactory } from '../../../database/tenant-repository';
import { PetEntity } from '../../../database/entities/tenant/pet.entity';
import { OwnerProfileEntity } from '../../../database/entities/tenant/owner-profile.entity';
import { PetGender } from '../../../database/entities/tenant/pet.entity';
import { IJwtPayload } from '../../../shared/interfaces/jwt-payload.interface';
import { PortalContextService } from '../common/portal-context.service';
import { RegisterPetDto } from './dto';

@Injectable()
export class MyPetsService {
  constructor(
    private readonly portalCtx: PortalContextService,
    private readonly repoFactory: TenantRepositoryFactory,
  ) {}

  async findAll(currentUser: IJwtPayload): Promise<PetEntity[]> {
    const schema = this.portalCtx.getSchema();
    const ownerProfile = await this.portalCtx.getOwnerProfile(currentUser.sub);

    return this.repoFactory.for(PetEntity, schema).find({
      where: { ownerId: ownerProfile.id },
      order: { name: 'ASC' },
    });
  }

  async findOne(petId: string, currentUser: IJwtPayload): Promise<PetEntity> {
    // assertPetOwnership throws 403 if not theirs
    return this.portalCtx.assertPetOwnership(petId, currentUser);
  }

  async register(
    dto: RegisterPetDto,
    currentUser: IJwtPayload,
  ): Promise<PetEntity> {
    const schema = this.portalCtx.getSchema();
    const ownerProfile = await this.portalCtx.getOwnerProfile(currentUser.sub);

    return this.repoFactory.for(PetEntity, schema).save({
      ownerId: ownerProfile.id,
      name: dto.name,
      species: dto.species,
      breed: dto.breed ?? null,
      dateOfBirth: dto.dateOfBirth ?? null,
      gender: dto.gender ?? PetGender.UNKNOWN,
      color: dto.color ?? null,
      microchipId: dto.microchipId ?? null,
      isNeutered: dto.isNeutered ?? null,
      notes: dto.notes ?? null,
      isDeceased: false,
    });
  }

  async update(
    petId: string,
    dto: Partial<RegisterPetDto>,
    currentUser: IJwtPayload,
  ): Promise<PetEntity> {
    const schema = this.portalCtx.getSchema();
    await this.portalCtx.assertPetOwnership(petId, currentUser);

    await this.repoFactory.for(PetEntity, schema).update(petId, {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.breed !== undefined && { breed: dto.breed }),
      ...(dto.dateOfBirth !== undefined && { dateOfBirth: dto.dateOfBirth }),
      ...(dto.gender !== undefined && { gender: dto.gender }),
      ...(dto.color !== undefined && { color: dto.color }),
      ...(dto.microchipId !== undefined && { microchipId: dto.microchipId }),
      ...(dto.isNeutered !== undefined && { isNeutered: dto.isNeutered }),
      ...(dto.notes !== undefined && { notes: dto.notes }),
    });

    return this.findOne(petId, currentUser);
  }
}
