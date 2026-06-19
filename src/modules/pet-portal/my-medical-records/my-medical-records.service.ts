import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { TenantConnectionService } from '../../../database/tenant-connection.service';
import { TenantRepositoryFactory } from '../../../database/tenant-repository';
import { MedicalRecordEntity } from '../../../database/entities/tenant/medical-record.entity';
import { IJwtPayload } from '../../../shared/interfaces/jwt-payload.interface';
import { PortalContextService } from '../common/portal-context.service';
import {
  IPaginatedResponse,
  buildPaginatedResponse,
} from '../../../shared/dto/paginated-response.interface';
import { PortalMedicalRecordQueryDto } from './dto';

@Injectable()
export class MyMedicalRecordsService {
  constructor(
    private readonly portalCtx: PortalContextService,
    private readonly tenantConn: TenantConnectionService,
    private readonly repoFactory: TenantRepositoryFactory,
  ) {}

  async findAll(
    query: PortalMedicalRecordQueryDto,
    currentUser: IJwtPayload,
  ): Promise<IPaginatedResponse<MedicalRecordEntity>> {
    const schema = this.portalCtx.getSchema();
    const ownerProfile = await this.portalCtx.getOwnerProfile(currentUser.sub);

    return this.tenantConn.runInTenantSchema(schema, async (em) => {
      const qb = em
        .createQueryBuilder(MedicalRecordEntity, 'mr')
        .innerJoin('mr.pet', 'pet')
        .leftJoin('mr.attendingVet', 'vet')
        .addSelect([
          'pet.id',
          'pet.name',
          'pet.species',
          'vet.id',
          'vet.firstName',
          'vet.lastName',
        ])
        // Ownership enforced at the join level
        .where('pet.owner_id = :ownerId', { ownerId: ownerProfile.id })
        .andWhere('mr.deleted_at IS NULL');

      if (query.petId)
        qb.andWhere('mr.pet_id = :petId', { petId: query.petId });
      if (query.recordType)
        qb.andWhere('mr.record_type = :type', { type: query.recordType });
      if (query.startDate)
        qb.andWhere('mr.visit_date >= :start', {
          start: new Date(query.startDate),
        });
      if (query.endDate)
        qb.andWhere('mr.visit_date <= :end', { end: new Date(query.endDate) });

      qb.orderBy('mr.visit_date', 'DESC').skip(query.skip).take(query.limit);

      const [items, total] = await qb.getManyAndCount();
      return buildPaginatedResponse(items, total, query.page, query.limit);
    });
  }

  async findOne(
    recordId: string,
    currentUser: IJwtPayload,
  ): Promise<MedicalRecordEntity> {
    const schema = this.portalCtx.getSchema();
    const ownerProfile = await this.portalCtx.getOwnerProfile(currentUser.sub);

    const record = await this.tenantConn.runInTenantSchema(schema, (em) =>
      em
        .createQueryBuilder(MedicalRecordEntity, 'mr')
        .innerJoin('mr.pet', 'pet')
        .leftJoin('mr.attendingVet', 'vet')
        .addSelect([
          'pet.id',
          'pet.name',
          'pet.species',
          'vet.id',
          'vet.firstName',
          'vet.lastName',
        ])
        .where('mr.id = :id', { id: recordId })
        .andWhere('pet.owner_id = :ownerId', { ownerId: ownerProfile.id })
        .getOne(),
    );

    if (!record) {
      // 403 — not 404 — to prevent enumeration of medical record IDs
      throw new ForbiddenException(
        'Medical record not found or does not belong to your pets',
      );
    }

    return record;
  }
}
