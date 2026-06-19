import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';

import { TenantConnectionService } from '../../../database/tenant-connection.service';
import { TenantRepositoryFactory } from '../../../database/tenant-repository';
import {
  AppointmentEntity,
  AppointmentStatus,
} from '../../../database/entities/tenant/appointment.entity';
import { UserEntity } from '../../../database/entities/tenant/user.entity';
import { ClinicServiceEntity } from '../../../database/entities/tenant/clinic-service.entity';
import { UserType } from '../../../shared/enums/user-type.enum';
import { IJwtPayload } from '../../../shared/interfaces/jwt-payload.interface';
import { PortalContextService } from '../common/portal-context.service';
import {
  IPaginatedResponse,
  buildPaginatedResponse,
} from '../../../shared/dto/paginated-response.interface';
import {
  BookAppointmentDto,
  PortalCancelAppointmentDto,
  PortalAppointmentQueryDto,
} from './dto';
import { NotificationProducer } from 'src/modules/jobs/producers/notification.producer';

/** Earliest booking window in hours */
const MIN_BOOKING_NOTICE_HOURS = 2;

/** How far ahead a pet owner can book */
const MAX_BOOKING_ADVANCE_DAYS = 60;

/** Portal owners can only cancel if appointment is >= this many hours away */
const MIN_CANCEL_NOTICE_HOURS = 24;

@Injectable()
export class MyAppointmentsService {
  constructor(
    private readonly portalCtx: PortalContextService,
    private readonly repoFactory: TenantRepositoryFactory,
    private readonly tenantConn: TenantConnectionService,
    private readonly notificationProducer: NotificationProducer,
  ) {}

  // ── Book ──────────────────────────────────────────────────────────

  async book(
    dto: BookAppointmentDto,
    currentUser: IJwtPayload,
  ): Promise<AppointmentEntity> {
    const schema = this.portalCtx.getSchema();

    // Ownership: the pet must belong to this owner
    const pet = await this.portalCtx.assertPetOwnership(dto.petId, currentUser);

    if (pet.isDeceased) {
      throw new BadRequestException(
        'Cannot book an appointment for a deceased patient',
      );
    }

    // Scheduling window validation
    const scheduledAt = new Date(dto.scheduledAt);
    this.assertBookingWindow(scheduledAt);

    // Vet must exist and be a vet
    const vet = await this.repoFactory
      .for(UserEntity, schema)
      .findOne({ where: { id: dto.vetId, isActive: true } });

    if (
      !vet ||
      (vet.userType !== UserType.VETERINARIAN &&
        vet.userType !== UserType.CLINIC_OWNER)
    ) {
      throw new NotFoundException(
        'The selected veterinarian was not found or is unavailable',
      );
    }

    // Service exists check
    if (dto.serviceId) {
      const svc = await this.repoFactory
        .for(ClinicServiceEntity, schema)
        .findOne({ where: { id: dto.serviceId, isActive: true } });
      if (!svc) {
        throw new NotFoundException('The selected service is not available');
      }
    }

    // Vet conflict check
    const durationMinutes = dto.serviceId
      ? ((
          await this.repoFactory
            .for(ClinicServiceEntity, schema)
            .findOne({ where: { id: dto.serviceId } })
        )?.durationMinutes ?? 30)
      : 30;

    await this.assertNoVetConflict(
      dto.vetId,
      scheduledAt,
      durationMinutes,
      schema,
    );

    const ownerProfile = await this.portalCtx.getOwnerProfile(currentUser.sub);

    return this.repoFactory.for(AppointmentEntity, schema).save({
      petId: dto.petId,
      vetId: dto.vetId,
      serviceId: dto.serviceId ?? null,
      scheduledAt,
      durationMinutes,
      status: AppointmentStatus.SCHEDULED,
      reason: dto.reason ?? null,
      notes: null,
      bookedById: currentUser.sub,
    });
  }

  // ── List & detail ─────────────────────────────────────────────────

  async findAll(
    query: PortalAppointmentQueryDto,
    currentUser: IJwtPayload,
  ): Promise<IPaginatedResponse<AppointmentEntity>> {
    const schema = this.portalCtx.getSchema();
    const ownerProfile = await this.portalCtx.getOwnerProfile(currentUser.sub);

    return this.tenantConn.runInTenantSchema(schema, async (em) => {
      const qb = em
        .createQueryBuilder(AppointmentEntity, 'a')
        .innerJoin('a.pet', 'pet')
        .leftJoinAndSelect('a.vet', 'vet')
        .leftJoinAndSelect('a.service', 'service')
        .addSelect(['pet.id', 'pet.name', 'pet.species'])
        // Only appointments for THIS owner's pets
        .where('pet.owner_id = :ownerId', { ownerId: ownerProfile.id })
        .andWhere('a.deleted_at IS NULL');

      if (query.petId) qb.andWhere('a.pet_id = :petId', { petId: query.petId });
      if (query.status)
        qb.andWhere('a.status = :status', { status: query.status });
      if (query.startDate)
        qb.andWhere('a.scheduled_at >= :start', {
          start: new Date(query.startDate),
        });
      if (query.endDate)
        qb.andWhere('a.scheduled_at <= :end', { end: new Date(query.endDate) });

      qb.orderBy('a.scheduled_at', query.sortOrder ?? 'DESC')
        .skip(query.skip)
        .take(query.limit);

      const [items, total] = await qb.getManyAndCount();
      return buildPaginatedResponse(items, total, query.page, query.limit);
    });
  }

  async findOne(
    appointmentId: string,
    currentUser: IJwtPayload,
  ): Promise<AppointmentEntity> {
    const schema = this.portalCtx.getSchema();
    const ownerProfile = await this.portalCtx.getOwnerProfile(currentUser.sub);

    const appt = await this.tenantConn.runInTenantSchema(schema, (em) =>
      em
        .createQueryBuilder(AppointmentEntity, 'a')
        .innerJoin('a.pet', 'pet')
        .leftJoinAndSelect('a.vet', 'vet')
        .leftJoinAndSelect('a.service', 'service')
        .addSelect(['pet.id', 'pet.name', 'pet.species'])
        .where('a.id = :id', { id: appointmentId })
        .andWhere('pet.owner_id = :ownerId', { ownerId: ownerProfile.id })
        .getOne(),
    );

    if (!appt) {
      // 403 not 404 — prevent enumeration
      throw new ForbiddenException(
        'Appointment not found or does not belong to your account',
      );
    }

    return appt;
  }

  // ── Cancel ────────────────────────────────────────────────────────

  async cancel(
    appointmentId: string,
    dto: PortalCancelAppointmentDto,
    currentUser: IJwtPayload,
  ): Promise<AppointmentEntity> {
    const schema = this.portalCtx.getSchema();
    const appt = await this.findOne(appointmentId, currentUser);

    if (
      appt.status === AppointmentStatus.CANCELLED ||
      appt.status === AppointmentStatus.COMPLETED ||
      appt.status === AppointmentStatus.NO_SHOW
    ) {
      throw new UnprocessableEntityException(
        `Cannot cancel an appointment with status "${appt.status}"`,
      );
    }

    // Enforce minimum notice period
    const hoursUntil =
      (appt.scheduledAt.getTime() - Date.now()) / (1000 * 60 * 60);

    if (hoursUntil < MIN_CANCEL_NOTICE_HOURS) {
      throw new UnprocessableEntityException(
        `Appointments must be cancelled at least ${MIN_CANCEL_NOTICE_HOURS} hours in advance. ` +
          `Please call the clinic to cancel last-minute appointments.`,
      );
    }

    await this.repoFactory
      .for(AppointmentEntity, schema)
      .update(appointmentId, {
        status: AppointmentStatus.CANCELLED,
        cancelledAt: new Date(),
        cancelledReason: dto.reason ?? 'Cancelled by pet owner via portal',
      });

    await this.notificationProducer.removeAppointmentReminders(
      appointmentId,
      [24, 2],
    );

    return this.findOne(appointmentId, currentUser);
  }

  // ── Available slots ───────────────────────────────────────────────

  async getAvailableSlots(
    vetId: string,
    date: string,
    durationMinutes: number,
  ): Promise<Array<{ startTime: string; endTime: string }>> {
    const schema = this.portalCtx.getSchema();

    // Clinic hours: 08:00–18:00 in 30-min increments
    const CLINIC_OPEN_HOUR = 8;
    const CLINIC_CLOSE_HOUR = 18;
    const SLOT_STEP_MIN = 30;

    const requestedDate = new Date(date);
    const dateStr = requestedDate.toISOString().split('T')[0];

    // Fetch existing bookings for this vet on this date
    const bookedSlots: Array<{ scheduled_at: Date; duration_minutes: number }> =
      await this.tenantConn.runInTenantSchema(schema, (em) =>
        em.query(
          `SELECT scheduled_at, duration_minutes
           FROM appointments
           WHERE vet_id = $1
             AND DATE(scheduled_at AT TIME ZONE 'UTC') = $2
             AND status NOT IN ('cancelled', 'no_show')
             AND deleted_at IS NULL`,
          [vetId, dateStr],
        ),
      );

    const slots: Array<{ startTime: string; endTime: string }> = [];

    for (let h = CLINIC_OPEN_HOUR; h < CLINIC_CLOSE_HOUR; h++) {
      for (let m = 0; m < 60; m += SLOT_STEP_MIN) {
        const slotStart = new Date(
          `${dateStr}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00Z`,
        );
        const slotEnd = new Date(
          slotStart.getTime() + durationMinutes * 60_000,
        );

        // Skip past slots
        if (slotStart <= new Date()) continue;

        // Skip if this slot would go past closing
        const closeTime = new Date(
          `${dateStr}T${String(CLINIC_CLOSE_HOUR).padStart(2, '0')}:00:00Z`,
        );
        if (slotEnd > closeTime) continue;

        // Check conflict with existing bookings
        const hasConflict = bookedSlots.some((booked) => {
          const bookedStart = new Date(booked.scheduled_at);
          const bookedEnd = new Date(
            bookedStart.getTime() + Number(booked.duration_minutes) * 60_000,
          );
          return slotStart < bookedEnd && slotEnd > bookedStart;
        });

        if (!hasConflict) {
          slots.push({
            startTime: slotStart.toISOString(),
            endTime: slotEnd.toISOString(),
          });
        }
      }
    }

    return slots;
  }

  // ── Private helpers ───────────────────────────────────────────────

  private assertBookingWindow(scheduledAt: Date): void {
    const now = Date.now();
    const minTime = now + MIN_BOOKING_NOTICE_HOURS * 60 * 60 * 1000;
    const maxTime = now + MAX_BOOKING_ADVANCE_DAYS * 24 * 60 * 60 * 1000;

    if (scheduledAt.getTime() < minTime) {
      throw new BadRequestException(
        `Appointments must be booked at least ${MIN_BOOKING_NOTICE_HOURS} hours in advance`,
      );
    }

    if (scheduledAt.getTime() > maxTime) {
      throw new BadRequestException(
        `Appointments cannot be booked more than ${MAX_BOOKING_ADVANCE_DAYS} days in advance`,
      );
    }
  }

  private async assertNoVetConflict(
    vetId: string,
    scheduledAt: Date,
    durationMinutes: number,
    schema: string,
  ): Promise<void> {
    const end = new Date(scheduledAt.getTime() + durationMinutes * 60_000);

    const conflicts: any[] = await this.tenantConn.runInTenantSchema(
      schema,
      (em) =>
        em.query(
          `SELECT id FROM appointments
         WHERE vet_id = $1
           AND deleted_at IS NULL
           AND status NOT IN ('cancelled', 'no_show')
           AND scheduled_at < $2
           AND (scheduled_at + (duration_minutes || ' minutes')::interval) > $3`,
          [vetId, end.toISOString(), scheduledAt.toISOString()],
        ),
    );

    if (conflicts.length > 0) {
      throw new ConflictException(
        'This time slot is no longer available. Please choose a different time.',
      );
    }
  }
}
