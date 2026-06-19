import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { AppointmentsService } from './appointments.service';
import { AppContexts } from '../../../core/decorators/app-contexts.decorator';
import { RequirePermissions } from '../../../core/decorators/require-permissions.decorator';
import { CurrentUser } from '../../../core/decorators/current-user.decorator';
import { AppContext } from '../../../shared/enums/app-context.enum';
import { Permission } from '../../../shared/enums/permission.enum';
import type { IJwtPayload } from '../../../shared/interfaces/jwt-payload.interface';
import { AppointmentStatus } from '../../../database/entities/tenant/appointment.entity';
import {
  CreateAppointmentDto,
  UpdateAppointmentDto,
  CancelAppointmentDto,
  AppointmentQueryDto,
} from './dto';

@ApiTags('CRM — Appointments')
@ApiBearerAuth()
@AppContexts(AppContext.CRM)
@Controller('crm/appointments')
export class AppointmentsController {
  constructor(private readonly apptService: AppointmentsService) {}

  @Get()
  @RequirePermissions(Permission.APPOINTMENT_READ)
  @ApiOperation({
    summary:
      'List appointments — vets see only their own unless APPOINTMENT_MANAGE',
  })
  findAll(
    @Query() query: AppointmentQueryDto,
    @CurrentUser() actor: IJwtPayload,
  ) {
    return this.apptService.findAll(query, actor);
  }

  @Get('schedule')
  @RequirePermissions(Permission.APPOINTMENT_READ)
  @ApiOperation({ summary: 'Day/week schedule view with optional vet filter' })
  @ApiQuery({ name: 'vetId', required: false })
  @ApiQuery({
    name: 'startDate',
    required: true,
    example: '2025-11-01T00:00:00Z',
  })
  @ApiQuery({
    name: 'endDate',
    required: true,
    example: '2025-11-07T23:59:59Z',
  })
  getSchedule(
    @Query('vetId') vetId: string | undefined,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @CurrentUser() actor: IJwtPayload,
  ) {
    return this.apptService.getSchedule(vetId, startDate, endDate, actor);
  }

  @Get(':id')
  @RequirePermissions(Permission.APPOINTMENT_READ)
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: IJwtPayload,
  ) {
    return this.apptService.findOne(id, actor);
  }

  @Post()
  @RequirePermissions(Permission.APPOINTMENT_CREATE)
  @ApiOperation({
    summary: 'Book a new appointment (checks vet schedule for conflicts)',
  })
  create(@Body() dto: CreateAppointmentDto, @CurrentUser() actor: IJwtPayload) {
    return this.apptService.create(dto, actor);
  }

  @Patch(':id')
  @RequirePermissions(Permission.APPOINTMENT_UPDATE)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAppointmentDto,
    @CurrentUser() actor: IJwtPayload,
  ) {
    return this.apptService.update(id, dto, actor);
  }

  // ── Status transitions ────────────────────────────────────────

  @Post(':id/confirm')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permission.APPOINTMENT_UPDATE)
  confirm(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() a: IJwtPayload,
  ) {
    return this.apptService.transition(id, AppointmentStatus.CONFIRMED, a);
  }

  @Post(':id/start')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permission.APPOINTMENT_UPDATE)
  start(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() a: IJwtPayload) {
    return this.apptService.transition(id, AppointmentStatus.IN_PROGRESS, a);
  }

  @Post(':id/complete')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permission.APPOINTMENT_UPDATE)
  complete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() a: IJwtPayload,
  ) {
    return this.apptService.transition(id, AppointmentStatus.COMPLETED, a);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permission.APPOINTMENT_UPDATE)
  cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelAppointmentDto,
    @CurrentUser() a: IJwtPayload,
  ) {
    return this.apptService.transition(
      id,
      AppointmentStatus.CANCELLED,
      a,
      dto.reason,
    );
  }

  @Post(':id/no-show')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permission.APPOINTMENT_UPDATE)
  noShow(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() a: IJwtPayload,
  ) {
    return this.apptService.transition(id, AppointmentStatus.NO_SHOW, a);
  }
}
