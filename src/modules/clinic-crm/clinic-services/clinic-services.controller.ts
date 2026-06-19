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
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import {
  ClinicServicesService,
  UpdateClinicServiceDto,
} from './clinic-services.service';
import { AppContexts } from '../../../core/decorators/app-contexts.decorator';
import { RequirePermissions } from '../../../core/decorators/require-permissions.decorator';
import { AppContext } from '../../../shared/enums/app-context.enum';
import { Permission } from '../../../shared/enums/permission.enum';
import { CreateClinicServiceDto } from './dto/create-clinic-service.dto';
import { Public } from '../../../core/decorators/public.decorator';

@ApiTags('CRM — Clinic Services')
@ApiBearerAuth()
@AppContexts(AppContext.CRM)
@Controller('crm/services')
export class ClinicServicesController {
  constructor(private readonly svcService: ClinicServicesService) {}

  @Get()
  @RequirePermissions(Permission.SETTINGS_READ)
  @ApiQuery({ name: 'activeOnly', required: false, type: Boolean })
  findAll(@Query('activeOnly') activeOnly?: string) {
    return this.svcService.findAll(activeOnly === 'true');
  }

  @Get(':id')
  @RequirePermissions(Permission.SETTINGS_READ)
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.svcService.findOne(id);
  }

  @Post()
  @RequirePermissions(Permission.SETTINGS_UPDATE)
  create(@Body() dto: CreateClinicServiceDto) {
    return this.svcService.create(dto);
  }

  @Patch(':id')
  @RequirePermissions(Permission.SETTINGS_UPDATE)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateClinicServiceDto,
  ) {
    return this.svcService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(Permission.SETTINGS_UPDATE)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.svcService.remove(id);
  }
}
