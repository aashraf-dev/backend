import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { TenantConnectionService } from '../../../database/tenant-connection.service';
import { TenantRepositoryFactory } from '../../../database/tenant-repository';
import { MedicalRecordEntity } from '../../../database/entities/tenant/medical-record.entity';
import { PetEntity } from '../../../database/entities/tenant/pet.entity';
import { CrmContextService } from '../common/crm-context.service';
import { IJwtPayload } from '../../../shared/interfaces/jwt-payload.interface';
import {
  IPaginatedResponse,
  buildPaginatedResponse,
} from '../../../shared/dto/paginated-response.interface';
import { CreateMedicalRecordDto } from './dto/create-medical-record.dto';
import { UpdateMedicalRecordDto } from './dto/update-medical-record.dto';
import { MedicalRecordQueryDto } from './dto/medical-record-query.dto';

@Injectable()
export class MedicalRecordsService {
  constructor(
    private readonly crmCtx: CrmContextService,
    private readonly repoFactory: TenantRepositoryFactory,
    private readonly tenantConn: TenantConnectionService,
  ) {}

  async findAll(
    query: MedicalRecordQueryDto,
    actor: IJwtPayload,
  ): Promise<IPaginatedResponse<MedicalRecordEntity>> {
    const schema = this.crmCtx.getSchema();

    return this.tenantConn.runInTenantSchema(schema, async (em) => {
      const qb = em
        .createQueryBuilder(MedicalRecordEntity, 'mr')
        .leftJoinAndSelect('mr.pet', 'pet')
        .leftJoinAndSelect('mr.attendingVet', 'vet')
        .where('mr.deleted_at IS NULL');

      // Interns and vets see only records they authored
      if (this.crmCtx.isClinicalStaff(actor)) {
        qb.andWhere('mr.attending_vet_id = :actorId', { actorId: actor.sub });
      }

      if (query.petId)
        qb.andWhere('mr.pet_id = :petId', { petId: query.petId });
      if (query.attendingVetId)
        qb.andWhere('mr.attending_vet_id = :vetId', {
          vetId: query.attendingVetId,
        });
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

  async findOne(id: string, actor: IJwtPayload): Promise<MedicalRecordEntity> {
    const schema = this.crmCtx.getSchema();

    const record = await this.tenantConn.runInTenantSchema(schema, (em) =>
      em.findOne(MedicalRecordEntity, {
        where: { id },
        relations: { pet: true, attendingVet: true },
      }),
    );

    if (!record)
      throw new NotFoundException(`Medical record "${id}" not found`);

    if (
      this.crmCtx.isClinicalStaff(actor) &&
      record.attendingVetId !== actor.sub
    ) {
      throw new ForbiddenException('You can only view records you authored');
    }

    return record;
  }

  async create(
    dto: CreateMedicalRecordDto,
    actor: IJwtPayload,
  ): Promise<MedicalRecordEntity> {
    const schema = this.crmCtx.getSchema();

    const pet = await this.repoFactory
      .for(PetEntity, schema)
      .findOne({ where: { id: dto.petId } });
    if (!pet) throw new NotFoundException(`Patient "${dto.petId}" not found`);

    return this.repoFactory.for(MedicalRecordEntity, schema).save({
      petId: dto.petId,
      attendingVetId: dto.attendingVetId,
      recordType: dto.recordType,
      visitDate: new Date(dto.visitDate),
      chiefComplaint: dto.chiefComplaint ?? null,
      diagnosis: dto.diagnosis ?? null,
      treatment: dto.treatment ?? null,
      notes: dto.notes ?? null,
      weightAtVisitKg: dto.weightAtVisitKg ?? null,
      temperatureCelsius: dto.temperatureCelsius ?? null,
      attachments: dto.attachments ?? [],
      followUpDate: dto.followUpDate ?? null,
    });
  }

  async update(
    id: string,
    dto: UpdateMedicalRecordDto,
    actor: IJwtPayload,
  ): Promise<MedicalRecordEntity> {
    const schema = this.crmCtx.getSchema();
    await this.findOne(id, actor); // enforces ownership check

    await this.repoFactory.for(MedicalRecordEntity, schema).update(id, {
      ...(dto.recordType !== undefined && { recordType: dto.recordType }),
      ...(dto.visitDate !== undefined && {
        visitDate: new Date(dto.visitDate),
      }),
      ...(dto.chiefComplaint !== undefined && {
        chiefComplaint: dto.chiefComplaint,
      }),
      ...(dto.diagnosis !== undefined && { diagnosis: dto.diagnosis }),
      ...(dto.treatment !== undefined && { treatment: dto.treatment }),
      ...(dto.notes !== undefined && { notes: dto.notes }),
      ...(dto.weightAtVisitKg !== undefined && {
        weightAtVisitKg: dto.weightAtVisitKg,
      }),
      ...(dto.temperatureCelsius !== undefined && {
        temperatureCelsius: dto.temperatureCelsius,
      }),
      ...(dto.attachments !== undefined && { attachments: dto.attachments }),
      ...(dto.followUpDate !== undefined && { followUpDate: dto.followUpDate }),
    });

    return this.findOne(id, actor);
  }

  async remove(id: string, actor: IJwtPayload): Promise<void> {
    const schema = this.crmCtx.getSchema();
    await this.findOne(id, actor);
    await this.repoFactory.for(MedicalRecordEntity, schema).softDelete(id);
  }
}
