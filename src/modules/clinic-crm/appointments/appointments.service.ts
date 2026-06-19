import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { TenantConnectionService } from '../../../database/tenant-connection.service';
import { TenantRepositoryFactory } from '../../../database/tenant-repository';
import {
  AppointmentEntity,
  AppointmentStatus,
} from '../../../database/entities/tenant/appointment.entity';
import { PetEntity } from '../../../database/entities/tenant/pet.entity';
import { UserEntity } from '../../../database/entities/tenant/user.entity';
import { CrmContextService } from '../common/crm-context.service';
import { IJwtPayload } from '../../../shared/interfaces/jwt-payload.interface';
import { UserType } from '../../../shared/enums/user-type.enum';
import {
  IPaginatedResponse,
  buildPaginatedResponse,
} from '../../../shared/dto/paginated-response.interface';
import {
  CreateAppointmentDto,
  UpdateAppointmentDto,
  CancelAppointmentDto,
  AppointmentQueryDto,
} from './dto';
import { NotificationProducer } from 'src/modules/jobs/producers/notification.producer';

/** Valid forward transitions for appointment status */
const STATUS_TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  [AppointmentStatus.SCHEDULED]: [
    AppointmentStatus.CONFIRMED,
    AppointmentStatus.CANCELLED,
    AppointmentStatus.NO_SHOW,
  ],
  [AppointmentStatus.CONFIRMED]: [
    AppointmentStatus.IN_PROGRESS,
    AppointmentStatus.CANCELLED,
    AppointmentStatus.NO_SHOW,
  ],
  [AppointmentStatus.IN_PROGRESS]: [
    AppointmentStatus.COMPLETED,
    AppointmentStatus.CANCELLED,
  ],
  [AppointmentStatus.COMPLETED]: [],
  [AppointmentStatus.CANCELLED]: [],
  [AppointmentStatus.NO_SHOW]: [],
};

@Injectable()
export class AppointmentsService {
  private readonly logger = new Logger(AppointmentsService.name);

  constructor(
    private readonly crmCtx: CrmContextService,
    private readonly repoFactory: TenantRepositoryFactory,
    private readonly tenantConn: TenantConnectionService,
    private readonly notificationProducer: NotificationProducer, // ← NEW
  ) {}

  // ── Create ───────────────────────────────────────────────────────

  async create(
    dto: CreateAppointmentDto,
    actor: IJwtPayload,
  ): Promise<AppointmentEntity> {
    const schema = this.crmCtx.getSchema();

    await this.assertPetExists(dto.petId, schema);
    await this.assertVetExists(dto.vetId, schema);
    await this.checkVetConflict(
      dto.vetId,
      dto.scheduledAt,
      dto.durationMinutes ?? 30,
      null,
      schema,
    );

    return this.repoFactory.for(AppointmentEntity, schema).save({
      petId: dto.petId,
      vetId: dto.vetId,
      serviceId: dto.serviceId ?? null,
      scheduledAt: new Date(dto.scheduledAt),
      durationMinutes: dto.durationMinutes ?? 30,
      status: AppointmentStatus.SCHEDULED,
      reason: dto.reason ?? null,
      notes: dto.notes ?? null,
      bookedById: actor.sub,
    });
  }

  // ── Read ──────────────────────────────────────────────────────────

  async findAll(
    query: AppointmentQueryDto,
    actor: IJwtPayload,
  ): Promise<IPaginatedResponse<AppointmentEntity>> {
    const schema = this.crmCtx.getSchema();

    return this.tenantConn.runInTenantSchema(schema, async (em) => {
      const qb = em
        .createQueryBuilder(AppointmentEntity, 'a')
        .leftJoinAndSelect('a.pet', 'pet')
        .leftJoinAndSelect('a.vet', 'vet')
        .leftJoinAndSelect('a.service', 'service')
        .where('a.deleted_at IS NULL');

      // Vets and interns see only their own appointments by default
      if (this.crmCtx.isClinicalStaff(actor)) {
        qb.andWhere('a.vet_id = :actorId', { actorId: actor.sub });
      }

      if (query.petId) qb.andWhere('a.pet_id = :petId', { petId: query.petId });
      if (query.vetId) qb.andWhere('a.vet_id = :vetId', { vetId: query.vetId });
      if (query.status)
        qb.andWhere('a.status = :status', { status: query.status });
      if (query.startDate)
        qb.andWhere('a.scheduled_at >= :start', {
          start: new Date(query.startDate),
        });
      if (query.endDate)
        qb.andWhere('a.scheduled_at <= :end', { end: new Date(query.endDate) });

      qb.orderBy('a.scheduled_at', query.sortOrder ?? 'ASC')
        .skip(query.skip)
        .take(query.limit);

      const [items, total] = await qb.getManyAndCount();
      return buildPaginatedResponse(items, total, query.page, query.limit);
    });
  }

  async findOne(id: string, actor: IJwtPayload): Promise<AppointmentEntity> {
    const schema = this.crmCtx.getSchema();

    const appt = await this.tenantConn.runInTenantSchema(schema, (em) =>
      em.findOne(AppointmentEntity, {
        where: { id },
        relations: { pet: true, vet: true, service: true },
      }),
    );

    if (!appt) throw new NotFoundException(`Appointment "${id}" not found`);

    // Clinical staff can only view their own appointments
    if (this.crmCtx.isClinicalStaff(actor) && appt.vetId !== actor.sub) {
      throw new ForbiddenException('You can only view your own appointments');
    }

    return appt;
  }

  // ── Update ────────────────────────────────────────────────────────

  async update(
    id: string,
    dto: UpdateAppointmentDto,
    actor: IJwtPayload,
  ): Promise<AppointmentEntity> {
    const schema = this.crmCtx.getSchema();
    const appt = await this.findOne(id, actor);

    if (
      [AppointmentStatus.COMPLETED, AppointmentStatus.CANCELLED].includes(
        appt.status,
      )
    ) {
      throw new UnprocessableEntityException(
        `Cannot modify a ${appt.status} appointment`,
      );
    }

    if (dto.scheduledAt || dto.durationMinutes) {
      await this.checkVetConflict(
        dto.vetId ?? appt.vetId,
        dto.scheduledAt ?? appt.scheduledAt.toISOString(),
        dto.durationMinutes ?? appt.durationMinutes,
        id,
        schema,
      );
    }

    await this.repoFactory.for(AppointmentEntity, schema).update(id, {
      ...(dto.petId !== undefined && { petId: dto.petId }),
      ...(dto.vetId !== undefined && { vetId: dto.vetId }),
      ...(dto.serviceId !== undefined && { serviceId: dto.serviceId }),
      ...(dto.scheduledAt !== undefined && {
        scheduledAt: new Date(dto.scheduledAt),
      }),
      ...(dto.durationMinutes !== undefined && {
        durationMinutes: dto.durationMinutes,
      }),
      ...(dto.reason !== undefined && { reason: dto.reason }),
      ...(dto.notes !== undefined && { notes: dto.notes }),
    });

    return this.findOne(id, actor);
  }

  // ── Status transitions ────────────────────────────────────────────

  async transition(
    id: string,
    targetStatus: AppointmentStatus,
    actor: IJwtPayload,
    cancelReason?: string,
  ): Promise<AppointmentEntity> {
    const schema = this.crmCtx.getSchema();
    const appt = await this.findOne(id, actor);
    const allowed = STATUS_TRANSITIONS[appt.status] ?? [];

    if (!allowed.includes(targetStatus)) {
      throw new UnprocessableEntityException(
        `Cannot transition appointment from "${appt.status}" to "${targetStatus}". ` +
          `Allowed: [${allowed.join(', ') || 'none'}]`,
      );
    }

    const update: Partial<AppointmentEntity> = { status: targetStatus };

    if (targetStatus === AppointmentStatus.CANCELLED) {
      update.cancelledAt = new Date();
      update.cancelledReason = cancelReason ?? null;

      await this.notificationProducer.removeAppointmentReminders(
        id,
        [24, 2], // Must match APPOINTMENT_REMINDER_HOURS env var
      );
    }

    await this.repoFactory.for(AppointmentEntity, schema).update(id, update);

    return this.findOne(id, actor);
  }

  // ── Schedule view ─────────────────────────────────────────────────

  async getSchedule(
    vetId: string | undefined,
    startDate: string,
    endDate: string,
    actor: IJwtPayload,
  ): Promise<AppointmentEntity[]> {
    const schema = this.crmCtx.getSchema();

    const effectiveVetId = this.crmCtx.isClinicalStaff(actor)
      ? actor.sub
      : vetId;

    return this.tenantConn.runInTenantSchema(schema, (em) => {
      const qb = em
        .createQueryBuilder(AppointmentEntity, 'a')
        .leftJoinAndSelect('a.pet', 'pet')
        .leftJoinAndSelect('a.vet', 'vet')
        .leftJoinAndSelect('a.service', 'service')
        .where('a.scheduled_at >= :start AND a.scheduled_at <= :end', {
          start: new Date(startDate),
          end: new Date(endDate),
        })
        .andWhere('a.deleted_at IS NULL')
        .andWhere('a.status NOT IN (:...inactive)', {
          inactive: [AppointmentStatus.CANCELLED],
        });

      if (effectiveVetId) {
        qb.andWhere('a.vet_id = :vetId', { vetId: effectiveVetId });
      }

      return qb.orderBy('a.scheduled_at', 'ASC').getMany();
    });
  }

  // ── Private helpers ───────────────────────────────────────────────

  private async assertPetExists(petId: string, schema: string): Promise<void> {
    const pet = await this.repoFactory
      .for(PetEntity, schema)
      .findOne({ where: { id: petId } });
    if (!pet) throw new NotFoundException(`Pet "${petId}" not found`);
    if (pet.isDeceased)
      throw new BadRequestException(
        'Cannot book appointment for a deceased patient',
      );
  }

  private async assertVetExists(vetId: string, schema: string): Promise<void> {
    const vet = await this.repoFactory
      .for(UserEntity, schema)
      .findOne({ where: { id: vetId } });
    if (!vet) throw new NotFoundException(`Veterinarian "${vetId}" not found`);
    if (
      vet.userType !== UserType.VETERINARIAN &&
      vet.userType !== UserType.CLINIC_OWNER
    ) {
      throw new BadRequestException('Assigned user is not a veterinarian');
    }
  }

  private async checkVetConflict(
    vetId: string,
    scheduledAt: string,
    durationMinutes: number,
    excludeId: string | null,
    schema: string,
  ): Promise<void> {
    const start = new Date(scheduledAt);
    const end = new Date(start.getTime() + durationMinutes * 60_000);

    const conflicts: any[] = await this.tenantConn.runInTenantSchema(
      schema,
      (em) =>
        em.query(
          `SELECT id FROM appointments
         WHERE vet_id = $1
           AND deleted_at IS NULL
           AND status NOT IN ('cancelled', 'no_show')
           AND scheduled_at < $2
           AND (scheduled_at + (duration_minutes || ' minutes')::interval) > $3
           ${excludeId ? 'AND id != $4' : ''}`,
          excludeId
            ? [vetId, end.toISOString(), start.toISOString(), excludeId]
            : [vetId, end.toISOString(), start.toISOString()],
        ),
    );

    if (conflicts.length > 0) {
      throw new ConflictException(
        'The selected veterinarian has a scheduling conflict at this time',
      );
    }
  }
}

// needed for ConflictException in conflict check
import { ConflictException } from '@nestjs/common';
