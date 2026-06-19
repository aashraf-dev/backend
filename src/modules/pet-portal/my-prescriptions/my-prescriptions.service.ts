import { ForbiddenException, Injectable } from '@nestjs/common';

import { TenantConnectionService } from '../../../database/tenant-connection.service';
import { TenantRepositoryFactory } from '../../../database/tenant-repository';
import { PrescriptionEntity } from '../../../database/entities/tenant/prescription.entity';
import { IJwtPayload } from '../../../shared/interfaces/jwt-payload.interface';
import { PortalContextService } from '../common/portal-context.service';
import {
  IPaginatedResponse,
  buildPaginatedResponse,
} from '../../../shared/dto/paginated-response.interface';
import { PortalPrescriptionQueryDto } from './dto';

@Injectable()
export class MyPrescriptionsService {
  constructor(
    private readonly portalCtx: PortalContextService,
    private readonly tenantConn: TenantConnectionService,
    private readonly repoFactory: TenantRepositoryFactory,
  ) {}

  async findAll(
    query: PortalPrescriptionQueryDto,
    currentUser: IJwtPayload,
  ): Promise<IPaginatedResponse<PrescriptionEntity>> {
    const schema = this.portalCtx.getSchema();
    const ownerProfile = await this.portalCtx.getOwnerProfile(currentUser.sub);

    return this.tenantConn.runInTenantSchema(schema, async (em) => {
      const qb = em
        .createQueryBuilder(PrescriptionEntity, 'rx')
        .innerJoin('rx.pet', 'pet')
        .leftJoin('rx.prescribedBy', 'vet')
        .addSelect([
          'pet.id',
          'pet.name',
          'pet.species',
          'vet.id',
          'vet.firstName',
          'vet.lastName',
        ])
        // Ownership at the JOIN level — cannot see other owners' prescriptions
        .where('pet.owner_id = :ownerId', { ownerId: ownerProfile.id })
        .andWhere('rx.deleted_at IS NULL');

      if (query.petId)
        qb.andWhere('rx.pet_id = :petId', { petId: query.petId });
      if (query.status)
        qb.andWhere('rx.status = :status', { status: query.status });

      qb.orderBy('rx.created_at', 'DESC').skip(query.skip).take(query.limit);

      const [items, total] = await qb.getManyAndCount();
      return buildPaginatedResponse(items, total, query.page, query.limit);
    });
  }

  async findOne(
    prescriptionId: string,
    currentUser: IJwtPayload,
  ): Promise<PrescriptionEntity> {
    const schema = this.portalCtx.getSchema();
    const ownerProfile = await this.portalCtx.getOwnerProfile(currentUser.sub);

    const rx = await this.tenantConn.runInTenantSchema(schema, (em) =>
      em
        .createQueryBuilder(PrescriptionEntity, 'rx')
        .innerJoin('rx.pet', 'pet')
        .leftJoin('rx.prescribedBy', 'vet')
        .leftJoin('rx.medicalRecord', 'mr')
        .addSelect([
          'pet.id',
          'pet.name',
          'pet.species',
          'vet.id',
          'vet.firstName',
          'vet.lastName',
          'mr.id',
          'mr.recordType',
          'mr.visitDate',
        ])
        .where('rx.id = :id', { id: prescriptionId })
        .andWhere('pet.owner_id = :ownerId', { ownerId: ownerProfile.id })
        .getOne(),
    );

    if (!rx) {
      throw new ForbiddenException(
        'Prescription not found or does not belong to your pets',
      );
    }

    return rx;
  }
}
