import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';

import { MyAppointmentsService } from './my-appointments.service';
import { AppContexts } from '../../../core/decorators/app-contexts.decorator';
import { RequirePermissions } from '../../../core/decorators/require-permissions.decorator';
import { CurrentUser } from '../../../core/decorators/current-user.decorator';
import { AppContext } from '../../../shared/enums/app-context.enum';
import { Permission } from '../../../shared/enums/permission.enum';
import type { IJwtPayload } from '../../../shared/interfaces/jwt-payload.interface';
import {
  BookAppointmentDto,
  PortalCancelAppointmentDto,
  PortalAppointmentQueryDto,
} from './dto';

@ApiTags('Portal — My Appointments')
@ApiBearerAuth()
@AppContexts(AppContext.PORTAL)
@Controller('portal/my-appointments')
export class MyAppointmentsController {
  constructor(private readonly apptService: MyAppointmentsService) {}

  @Get()
  @RequirePermissions(Permission.OWN_APPOINTMENTS_READ)
  @ApiOperation({ summary: "List all appointments for this owner's pets" })
  findAll(
    @Query() query: PortalAppointmentQueryDto,
    @CurrentUser() user: IJwtPayload,
  ) {
    return this.apptService.findAll(query, user);
  }

  @Get('available-slots')
  @RequirePermissions(Permission.OWN_APPOINTMENTS_READ)
  @ApiOperation({
    summary: 'Get available booking slots for a vet on a specific date',
  })
  @ApiQuery({ name: 'vetId', required: true })
  @ApiQuery({ name: 'date', required: true, example: '2025-11-20' })
  @ApiQuery({ name: 'duration', required: false, type: Number, example: 30 })
  getAvailableSlots(
    @Query('vetId') vetId: string,
    @Query('date') date: string,
    @Query('duration') duration?: string,
  ) {
    return this.apptService.getAvailableSlots(
      vetId,
      date,
      duration ? parseInt(duration, 10) : 30,
    );
  }

  @Get(':appointmentId')
  @RequirePermissions(Permission.OWN_APPOINTMENTS_READ)
  @ApiOperation({
    summary: 'Get single appointment detail (ownership enforced)',
  })
  findOne(
    @Param('appointmentId', ParseUUIDPipe) appointmentId: string,
    @CurrentUser() user: IJwtPayload,
  ) {
    return this.apptService.findOne(appointmentId, user);
  }

  @Post()
  @RequirePermissions(Permission.OWN_APPOINTMENTS_CREATE)
  @ApiOperation({ summary: 'Book a new appointment for one of your pets' })
  book(@Body() dto: BookAppointmentDto, @CurrentUser() user: IJwtPayload) {
    return this.apptService.book(dto, user);
  }

  @Post(':appointmentId/cancel')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permission.OWN_APPOINTMENTS_READ)
  @ApiOperation({
    summary: 'Cancel an upcoming appointment',
    description: `Appointments must be cancelled at least 24 hours in advance via the portal.
    For same-day cancellations, please call the clinic directly.`,
  })
  cancel(
    @Param('appointmentId', ParseUUIDPipe) appointmentId: string,
    @Body() dto: PortalCancelAppointmentDto,
    @CurrentUser() user: IJwtPayload,
  ) {
    return this.apptService.cancel(appointmentId, dto, user);
  }
}
