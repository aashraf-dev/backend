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
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PatientsService } from './patients.service';
import { AppContexts } from '../../../core/decorators/app-contexts.decorator';
import { RequirePermissions } from '../../../core/decorators/require-permissions.decorator';
import { AppContext } from '../../../shared/enums/app-context.enum';
import { Permission } from '../../../shared/enums/permission.enum';
import { CreatePetDto } from './dto/create-pet.dto';
import { UpdatePetDto } from './dto/update-pet.dto';
import { PatientQueryDto } from './dto/patient-query.dto';

@ApiTags('CRM — Patients')
@ApiBearerAuth()
@AppContexts(AppContext.CRM)
@Controller('crm/patients')
export class PatientsController {
  constructor(private readonly patientsService: PatientsService) {}

  @Get()
  @RequirePermissions(Permission.PET_READ)
  findAll(@Query() query: PatientQueryDto) {
    return this.patientsService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions(Permission.PET_READ)
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.patientsService.findOne(id);
  }

  @Get(':id/history')
  @RequirePermissions(Permission.PET_READ)
  @ApiOperation({
    summary: 'Full patient history — appointments, records, prescriptions',
  })
  getHistory(@Param('id', ParseUUIDPipe) id: string) {
    return this.patientsService.getHistory(id);
  }

  @Post()
  @RequirePermissions(Permission.PET_CREATE)
  create(@Body() dto: CreatePetDto) {
    return this.patientsService.create(dto);
  }

  @Patch(':id')
  @RequirePermissions(Permission.PET_UPDATE)
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdatePetDto) {
    return this.patientsService.update(id, dto);
  }

  @Post(':id/deceased')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permission.PET_UPDATE)
  @ApiOperation({ summary: 'Mark patient as deceased' })
  markDeceased(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('deceasedAt') deceasedAt?: string,
  ) {
    return this.patientsService.markDeceased(id, deceasedAt);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(Permission.PET_DELETE)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.patientsService.remove(id);
  }
}
