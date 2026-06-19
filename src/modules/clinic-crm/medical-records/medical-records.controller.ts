import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { MedicalRecordsService } from './medical-records.service';
import { AppContexts } from '../../../core/decorators/app-contexts.decorator';
import { RequirePermissions } from '../../../core/decorators/require-permissions.decorator';
import { CurrentUser } from '../../../core/decorators/current-user.decorator';
import { AppContext } from '../../../shared/enums/app-context.enum';
import { Permission } from '../../../shared/enums/permission.enum';
import type { IJwtPayload } from '../../../shared/interfaces/jwt-payload.interface';
import { CreateMedicalRecordDto } from './dto/create-medical-record.dto';
import { UpdateMedicalRecordDto } from './dto/update-medical-record.dto';
import { MedicalRecordQueryDto } from './dto/medical-record-query.dto';

@ApiTags('CRM — Medical Records')
@ApiBearerAuth()
@AppContexts(AppContext.CRM)
@Controller('crm/medical-records')
export class MedicalRecordsController {
  constructor(private readonly recordsService: MedicalRecordsService) {}

  @Get()
  @RequirePermissions(Permission.MEDICAL_RECORD_READ)
  findAll(
    @Query() query: MedicalRecordQueryDto,
    @CurrentUser() a: IJwtPayload,
  ) {
    return this.recordsService.findAll(query, a);
  }

  @Get(':id')
  @RequirePermissions(Permission.MEDICAL_RECORD_READ)
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() a: IJwtPayload,
  ) {
    return this.recordsService.findOne(id, a);
  }

  @Post()
  @RequirePermissions(Permission.MEDICAL_RECORD_CREATE)
  create(@Body() dto: CreateMedicalRecordDto, @CurrentUser() a: IJwtPayload) {
    return this.recordsService.create(dto, a);
  }

  @Patch(':id')
  @RequirePermissions(Permission.MEDICAL_RECORD_UPDATE)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMedicalRecordDto,
    @CurrentUser() a: IJwtPayload,
  ) {
    return this.recordsService.update(id, dto, a);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(Permission.MEDICAL_RECORD_DELETE)
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() a: IJwtPayload,
  ) {
    return this.recordsService.remove(id, a);
  }
}
