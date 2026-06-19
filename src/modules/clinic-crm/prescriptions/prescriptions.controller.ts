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
import { PrescriptionsService } from './prescriptions.service';
import { AppContexts } from '../../../core/decorators/app-contexts.decorator';
import { RequirePermissions } from '../../../core/decorators/require-permissions.decorator';
import { CurrentUser } from '../../../core/decorators/current-user.decorator';
import { AppContext } from '../../../shared/enums/app-context.enum';
import { Permission } from '../../../shared/enums/permission.enum';
import type { IJwtPayload } from '../../../shared/interfaces/jwt-payload.interface';
import { PrescriptionStatus } from '../../../database/entities/tenant/prescription.entity';
import { PaginationDto } from '../../../shared/dto/pagination.dto';
import { CreatePrescriptionDto } from './dto/create-prescription.dto';
import { UpdatePrescriptionDto } from './dto/update-prescription.dto';

@ApiTags('CRM — Prescriptions')
@ApiBearerAuth()
@AppContexts(AppContext.CRM)
@Controller('crm/prescriptions')
export class PrescriptionsController {
  constructor(private readonly rxService: PrescriptionsService) {}

  @Get()
  @RequirePermissions(Permission.PRESCRIPTION_READ)
  @ApiQuery({ name: 'petId', required: false })
  @ApiQuery({ name: 'status', enum: PrescriptionStatus, required: false })
  findAll(
    @Query()
    query: PaginationDto & { petId?: string; status?: PrescriptionStatus },
    @CurrentUser() actor: IJwtPayload,
  ) {
    return this.rxService.findAll(query, actor);
  }

  @Get(':id')
  @RequirePermissions(Permission.PRESCRIPTION_READ)
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() a: IJwtPayload,
  ) {
    return this.rxService.findOne(id, a);
  }

  @Post()
  @RequirePermissions(Permission.PRESCRIPTION_CREATE)
  @ApiOperation({ summary: 'Issue a new prescription' })
  create(@Body() dto: CreatePrescriptionDto, @CurrentUser() a: IJwtPayload) {
    return this.rxService.create(dto, a);
  }

  @Patch(':id')
  @RequirePermissions(Permission.PRESCRIPTION_UPDATE)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePrescriptionDto,
    @CurrentUser() a: IJwtPayload,
  ) {
    return this.rxService.update(id, dto, a);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permission.PRESCRIPTION_DELETE)
  cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() a: IJwtPayload,
  ) {
    return this.rxService.cancel(id, a);
  }
}
