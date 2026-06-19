import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { TenantRepositoryFactory } from '../../../database/tenant-repository';
import {
  PrescriptionEntity,
  PrescriptionStatus,
} from '../../../database/entities/tenant/prescription.entity';
import { PetEntity } from '../../../database/entities/tenant/pet.entity';
import { CrmContextService } from '../common/crm-context.service';
import { IJwtPayload } from '../../../shared/interfaces/jwt-payload.interface';
import {
  IPaginatedResponse,
  buildPaginatedResponse,
} from '../../../shared/dto/paginated-response.interface';
import { PaginationDto } from '../../../shared/dto/pagination.dto';
import { CreatePrescriptionDto } from './dto/create-prescription.dto';
import { UpdatePrescriptionDto } from './dto/update-prescription.dto';

@Injectable()
export class PrescriptionsService {
  constructor(
    private readonly crmCtx: CrmContextService,
    private readonly repoFactory: TenantRepositoryFactory,
  ) {}

  async findAll(
    query: PaginationDto & { petId?: string; status?: PrescriptionStatus },
    actor: IJwtPayload,
  ): Promise<IPaginatedResponse<PrescriptionEntity>> {
    const schema = this.crmCtx.getSchema();
    const repo = this.repoFactory.for(PrescriptionEntity, schema);

    const where: Record<string, any> = {};
    if (query.petId) where.petId = query.petId;
    if (query.status) where.status = query.status;
    // Interns see only their own prescriptions
    if (this.crmCtx.isClinicalStaff(actor)) {
      where.prescribedById = actor.sub;
    }

    const [items, total] = await repo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: query.skip,
      take: query.limit,
    });

    return buildPaginatedResponse(items, total, query.page, query.limit);
  }

  async findOne(id: string, actor: IJwtPayload): Promise<PrescriptionEntity> {
    const schema = this.crmCtx.getSchema();
    const rx = await this.repoFactory
      .for(PrescriptionEntity, schema)
      .findOne({ where: { id } });

    if (!rx) throw new NotFoundException(`Prescription "${id}" not found`);

    if (this.crmCtx.isClinicalStaff(actor) && rx.prescribedById !== actor.sub) {
      throw new ForbiddenException(
        'You can only view prescriptions you issued',
      );
    }

    return rx;
  }

  async create(
    dto: CreatePrescriptionDto,
    actor: IJwtPayload,
  ): Promise<PrescriptionEntity> {
    const schema = this.crmCtx.getSchema();

    const pet = await this.repoFactory
      .for(PetEntity, schema)
      .findOne({ where: { id: dto.petId } });
    if (!pet) throw new NotFoundException(`Patient "${dto.petId}" not found`);

    return this.repoFactory.for(PrescriptionEntity, schema).save({
      petId: dto.petId,
      prescribedById: actor.sub,
      medicalRecordId: dto.medicalRecordId ?? null,
      medicationName: dto.medicationName,
      dosage: dto.dosage,
      frequency: dto.frequency,
      durationDays: dto.durationDays ?? null,
      instructions: dto.instructions ?? null,
      startDate: dto.startDate,
      endDate: dto.endDate ?? null,
      status: PrescriptionStatus.ACTIVE,
      refillsRemaining: dto.refillsRemaining ?? 0,
    });
  }

  async update(
    id: string,
    dto: UpdatePrescriptionDto,
    actor: IJwtPayload,
  ): Promise<PrescriptionEntity> {
    const schema = this.crmCtx.getSchema();
    const rx = await this.findOne(id, actor);

    if (rx.status !== PrescriptionStatus.ACTIVE) {
      throw new UnprocessableEntityException(
        `Cannot modify a ${rx.status} prescription`,
      );
    }

    await this.repoFactory.for(PrescriptionEntity, schema).update(id, {
      ...(dto.medicationName !== undefined && {
        medicationName: dto.medicationName,
      }),
      ...(dto.dosage !== undefined && { dosage: dto.dosage }),
      ...(dto.frequency !== undefined && { frequency: dto.frequency }),
      ...(dto.durationDays !== undefined && { durationDays: dto.durationDays }),
      ...(dto.instructions !== undefined && { instructions: dto.instructions }),
      ...(dto.startDate !== undefined && { startDate: dto.startDate }),
      ...(dto.endDate !== undefined && { endDate: dto.endDate }),
      ...(dto.refillsRemaining !== undefined && {
        refillsRemaining: dto.refillsRemaining,
      }),
    });

    return this.findOne(id, actor);
  }

  async cancel(id: string, actor: IJwtPayload): Promise<PrescriptionEntity> {
    const schema = this.crmCtx.getSchema();
    const rx = await this.findOne(id, actor);

    if (rx.status === PrescriptionStatus.CANCELLED) {
      throw new UnprocessableEntityException(
        'Prescription is already cancelled',
      );
    }

    await this.repoFactory
      .for(PrescriptionEntity, schema)
      .update(id, { status: PrescriptionStatus.CANCELLED });

    return this.findOne(id, actor);
  }
}
