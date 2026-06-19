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

import { StaffService } from './staff.service';
import { AppContexts } from '../../../core/decorators/app-contexts.decorator';
import { RequirePermissions } from '../../../core/decorators/require-permissions.decorator';
import { CurrentUser } from '../../../core/decorators/current-user.decorator';
import { AppContext } from '../../../shared/enums/app-context.enum';
import { Permission } from '../../../shared/enums/permission.enum';
import type { IJwtPayload } from '../../../shared/interfaces/jwt-payload.interface';
import {
  CreateStaffDto,
  UpdateStaffDto,
  AssignRoleDto,
  AssignDepartmentDto,
  SetDesignationDto,
  AddPermissionOverrideDto,
  StaffQueryDto,
} from './dto';

@ApiTags('CRM — Staff')
@ApiBearerAuth()
@AppContexts(AppContext.CRM)
@Controller('crm/staff')
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  @Get()
  @RequirePermissions(Permission.USER_READ)
  @ApiOperation({ summary: 'List all clinic staff with filters' })
  findAll(@Query() query: StaffQueryDto) {
    return this.staffService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions(Permission.USER_READ)
  @ApiOperation({
    summary: 'Get full staff profile with roles, departments, and designation',
  })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.staffService.findOne(id);
  }

  @Post()
  @RequirePermissions(Permission.USER_MANAGE)
  @ApiOperation({ summary: 'Invite a new staff member' })
  create(@Body() dto: CreateStaffDto, @CurrentUser() actor: IJwtPayload) {
    return this.staffService.create(dto, actor);
  }

  @Patch(':id')
  @RequirePermissions(Permission.USER_MANAGE)
  @ApiOperation({ summary: 'Update staff name, type, or designation' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStaffDto,
    @CurrentUser() actor: IJwtPayload,
  ) {
    return this.staffService.update(id, dto, actor);
  }

  @Post(':id/activate')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(Permission.USER_MANAGE)
  @ApiOperation({ summary: 'Activate a deactivated staff member' })
  activate(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: IJwtPayload,
  ) {
    return this.staffService.setActive(id, true, actor);
  }

  @Post(':id/deactivate')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(Permission.USER_MANAGE)
  @ApiOperation({
    summary: 'Deactivate staff — immediately invalidates all sessions',
  })
  deactivate(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: IJwtPayload,
  ) {
    return this.staffService.setActive(id, false, actor);
  }

  // ── Roles ─────────────────────────────────────────────────────

  @Post(':id/roles')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(Permission.USER_MANAGE)
  @ApiOperation({ summary: 'Assign a role to a staff member' })
  assignRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignRoleDto,
    @CurrentUser() actor: IJwtPayload,
  ) {
    return this.staffService.assignRole(id, dto, actor);
  }

  @Delete(':id/roles/:roleId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(Permission.USER_MANAGE)
  @ApiOperation({ summary: 'Revoke a role from a staff member' })
  revokeRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('roleId', ParseUUIDPipe) roleId: string,
    @CurrentUser() actor: IJwtPayload,
  ) {
    return this.staffService.revokeRole(id, roleId, actor);
  }

  // ── Departments ───────────────────────────────────────────────

  @Post(':id/departments')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(Permission.USER_MANAGE)
  @ApiOperation({ summary: 'Assign staff to a department' })
  assignDepartment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignDepartmentDto,
    @CurrentUser() actor: IJwtPayload,
  ) {
    return this.staffService.assignDepartment(id, dto, actor);
  }

  @Delete(':id/departments/:departmentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(Permission.USER_MANAGE)
  @ApiOperation({ summary: 'Remove staff from a department' })
  removeDepartment(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('departmentId', ParseUUIDPipe) departmentId: string,
  ) {
    return this.staffService.removeDepartment(id, departmentId);
  }

  // ── Designation ───────────────────────────────────────────────

  @Patch(':id/designation')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(Permission.USER_MANAGE)
  @ApiOperation({ summary: "Set or clear a staff member's designation" })
  setDesignation(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetDesignationDto,
  ) {
    return this.staffService.setDesignation(id, dto);
  }

  // ── Permission overrides ──────────────────────────────────────

  @Get(':id/permissions/overrides')
  @RequirePermissions(Permission.USER_MANAGE)
  @ApiOperation({ summary: 'List all permission overrides for a staff member' })
  listOverrides(@Param('id', ParseUUIDPipe) id: string) {
    return this.staffService.listPermissionOverrides(id);
  }

  @Post(':id/permissions/overrides')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(Permission.USER_MANAGE)
  @ApiOperation({
    summary: 'Grant or deny a specific permission to a staff member',
  })
  addOverride(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddPermissionOverrideDto,
    @CurrentUser() actor: IJwtPayload,
  ) {
    return this.staffService.addPermissionOverride(id, dto, actor);
  }

  @Delete(':id/permissions/overrides/:permissionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(Permission.USER_MANAGE)
  @ApiOperation({ summary: 'Remove a permission override' })
  removeOverride(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('permissionId', ParseUUIDPipe) permissionId: string,
  ) {
    return this.staffService.removePermissionOverride(id, permissionId);
  }
}
