import { Injectable, NotFoundException } from '@nestjs/common';
import { TenantConnectionService } from '../../../database/tenant-connection.service';
import { TenantRepositoryFactory } from '../../../database/tenant-repository';
import { PetEntity } from '../../../database/entities/tenant/pet.entity';
import { UserEntity } from '../../../database/entities/tenant/user.entity';
import { OwnerProfileEntity } from '../../../database/entities/tenant/owner-profile.entity';
import { AppointmentEntity } from '../../../database/entities/tenant/appointment.entity';
import { MedicalRecordEntity } from '../../../database/entities/tenant/medical-record.entity';
import { PrescriptionEntity } from '../../../database/entities/tenant/prescription.entity';
import { UserType } from '../../../shared/enums/user-type.enum';
import { CrmContextService } from '../common/crm-context.service';
import {
  IPaginatedResponse,
  buildPaginatedResponse,
} from '../../../shared/dto/paginated-response.interface';
import { CreatePetDto } from './dto/create-pet.dto';
import { UpdatePetDto } from './dto/update-pet.dto';
import { PatientQueryDto } from './dto/patient-query.dto';

@Injectable()
export class PatientsService {
  constructor(
    private readonly crmCtx: CrmContextService,
    private readonly repoFactory: TenantRepositoryFactory,
    private readonly tenantConn: TenantConnectionService,
  ) {}

  async findAll(query: PatientQueryDto): Promise<IPaginatedResponse<unknown>> {
    const schema = this.crmCtx.getSchema();

    return this.tenantConn.runInTenantSchema(schema, async (em) => {
      const qb = em
        .createQueryBuilder(PetEntity, 'p')
        .leftJoinAndSelect('p.owner', 'owner')
        .leftJoin('owner.user', 'u')
        .addSelect(['u.id', 'u.email', 'u.firstName', 'u.lastName'])
        .where('p.deleted_at IS NULL');

      if (query.search) {
        qb.andWhere(
          '(p.name ILIKE :s OR p.breed ILIKE :s OR p.microchip_id ILIKE :s OR u.first_name ILIKE :s OR u.last_name ILIKE :s)',
          { s: `%${query.search}%` },
        );
      }

      if (query.ownerId)
        qb.andWhere('p.owner_id = :ownerId', { ownerId: query.ownerId });
      if (query.species)
        qb.andWhere('p.species  = :species', { species: query.species });
      if (query.gender)
        qb.andWhere('p.gender   = :gender', { gender: query.gender });
      if (query.excludeDeceased) qb.andWhere('p.is_deceased = FALSE');

      qb.orderBy('p.name', 'ASC').skip(query.skip).take(query.limit);

      const [items, total] = await qb.getManyAndCount();
      return buildPaginatedResponse(items, total, query.page, query.limit);
    });
  }

  async findOne(id: string): Promise<PetEntity> {
    const schema = this.crmCtx.getSchema();

    const pet = await this.tenantConn.runInTenantSchema(schema, (em) =>
      em.findOne(PetEntity, {
        where: { id },
        relations: { owner: { user: true } },
      }),
    );

    if (!pet) throw new NotFoundException(`Patient "${id}" not found`);
    return pet;
  }

  async create(dto: CreatePetDto): Promise<PetEntity> {
    const schema = this.crmCtx.getSchema();

    const ownerProfile = await this.repoFactory
      .for(OwnerProfileEntity, schema)
      .findOne({ where: { userId: dto.ownerId } });

    if (!ownerProfile) {
      throw new NotFoundException(
        `Owner profile for user "${dto.ownerId}" not found. Ensure the user exists and has a pet_owner profile.`,
      );
    }

    return this.repoFactory.for(PetEntity, schema).save({
      ownerId: ownerProfile.id,
      name: dto.name,
      species: dto.species,
      breed: dto.breed ?? null,
      dateOfBirth: dto.dateOfBirth ?? null,
      gender: dto.gender,
      color: dto.color ?? null,
      weightKg: dto.weightKg ?? null,
      microchipId: dto.microchipId ?? null,
      isNeutered: dto.isNeutered ?? null,
      notes: dto.notes ?? null,
      isDeceased: false,
    });
  }

  async update(id: string, dto: UpdatePetDto): Promise<PetEntity> {
    const schema = this.crmCtx.getSchema();
    await this.findOne(id);

    await this.repoFactory.for(PetEntity, schema).update(id, {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.species !== undefined && { species: dto.species }),
      ...(dto.breed !== undefined && { breed: dto.breed }),
      ...(dto.dateOfBirth !== undefined && { dateOfBirth: dto.dateOfBirth }),
      ...(dto.gender !== undefined && { gender: dto.gender }),
      ...(dto.color !== undefined && { color: dto.color }),
      ...(dto.weightKg !== undefined && { weightKg: dto.weightKg }),
      ...(dto.microchipId !== undefined && { microchipId: dto.microchipId }),
      ...(dto.isNeutered !== undefined && { isNeutered: dto.isNeutered }),
      ...(dto.notes !== undefined && { notes: dto.notes }),
    });

    return this.findOne(id);
  }

  async markDeceased(id: string, deceasedAt?: string): Promise<PetEntity> {
    const schema = this.crmCtx.getSchema();
    await this.findOne(id);

    await this.repoFactory.for(PetEntity, schema).update(id, {
      isDeceased: true,
      deceasedAt: deceasedAt ?? new Date().toISOString().split('T')[0],
    });

    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const schema = this.crmCtx.getSchema();
    await this.findOne(id);
    await this.repoFactory.for(PetEntity, schema).softDelete(id);
  }

  async getHistory(petId: string): Promise<{
    appointments: AppointmentEntity[];
    medicalRecords: MedicalRecordEntity[];
    prescriptions: PrescriptionEntity[];
  }> {
    const schema = this.crmCtx.getSchema();
    await this.findOne(petId);

    const [appointments, medicalRecords, prescriptions] = await Promise.all([
      this.repoFactory.for(AppointmentEntity, schema).find({
        where: { petId },
        order: { scheduledAt: 'DESC' },
        take: 50,
      }),
      this.repoFactory.for(MedicalRecordEntity, schema).find({
        where: { petId },
        order: { visitDate: 'DESC' },
        take: 50,
      }),
      this.repoFactory.for(PrescriptionEntity, schema).find({
        where: { petId },
        order: { createdAt: 'DESC' },
        take: 50,
      }),
    ]);

    return { appointments, medicalRecords, prescriptions };
  }
}
