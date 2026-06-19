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
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { DesignationsService } from './designations.service';
import { AppContexts } from '../../../core/decorators/app-contexts.decorator';
import { RequirePermissions } from '../../../core/decorators/require-permissions.decorator';
import { AppContext } from '../../../shared/enums/app-context.enum';
import { Permission } from '../../../shared/enums/permission.enum';
import { CreateDesignationDto, UpdateDesignationDto } from './dto';

@ApiTags('CRM — Designations')
@ApiBearerAuth()
@AppContexts(AppContext.CRM)
@Controller('crm/designations')
export class DesignationsController {
  constructor(private readonly desigService: DesignationsService) {}

  @Get()
  @RequirePermissions(Permission.DESIGNATION_MANAGE)
  findAll() {
    return this.desigService.findAll();
  }

  @Get(':id')
  @RequirePermissions(Permission.DESIGNATION_MANAGE)
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.desigService.findOne(id);
  }

  @Post()
  @RequirePermissions(Permission.DESIGNATION_MANAGE)
  create(@Body() dto: CreateDesignationDto) {
    return this.desigService.create(dto);
  }

  @Patch(':id')
  @RequirePermissions(Permission.DESIGNATION_MANAGE)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDesignationDto,
  ) {
    return this.desigService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(Permission.DESIGNATION_MANAGE)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.desigService.remove(id);
  }
}
