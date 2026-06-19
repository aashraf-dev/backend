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
import { DepartmentsService } from './departments.service';
import { AppContexts } from '../../../core/decorators/app-contexts.decorator';
import { RequirePermissions } from '../../../core/decorators/require-permissions.decorator';
import { AppContext } from '../../../shared/enums/app-context.enum';
import { Permission } from '../../../shared/enums/permission.enum';
import { CreateDepartmentDto, UpdateDepartmentDto } from './dto';

@ApiTags('CRM — Departments')
@ApiBearerAuth()
@AppContexts(AppContext.CRM)
@Controller('crm/departments')
export class DepartmentsController {
  constructor(private readonly deptService: DepartmentsService) {}

  @Get()
  @RequirePermissions(Permission.DEPARTMENT_MANAGE)
  @ApiOperation({ summary: 'List all departments' })
  findAll() {
    return this.deptService.findAll();
  }

  @Get(':id')
  @RequirePermissions(Permission.DEPARTMENT_MANAGE)
  @ApiOperation({ summary: 'Get department by ID' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.deptService.findOne(id);
  }

  @Post()
  @RequirePermissions(Permission.DEPARTMENT_MANAGE)
  @ApiOperation({ summary: 'Create a new department' })
  create(@Body() dto: CreateDepartmentDto) {
    return this.deptService.create(dto);
  }

  @Patch(':id')
  @RequirePermissions(Permission.DEPARTMENT_MANAGE)
  @ApiOperation({ summary: 'Update department details or active status' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDepartmentDto,
  ) {
    return this.deptService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(Permission.DEPARTMENT_MANAGE)
  @ApiOperation({ summary: 'Delete department (only if no members assigned)' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.deptService.remove(id);
  }
}
