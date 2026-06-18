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
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

// import { TenantsService } from './tenants.service';
import { TenantsService } from './tenants.service';
import { AppContexts } from '../../../core/decorators/app-contexts.decorator';
import { RequirePermissions } from '../../../core/decorators/require-permissions.decorator';
import { CurrentUser } from '../../../core/decorators/current-user.decorator';
import { AppContext } from '../../../shared/enums/app-context.enum';
import { Permission } from '../../../shared/enums/permission.enum';
import { IJwtPayload } from '../../../shared/interfaces/jwt-payload.interface';

import {
  CreateTenantDto,
  TenantQueryDto,
  UpdateTenantDto,
  UpdateSubscriptionDto,
  RetryProvisioningDto,
} from './dto';

@ApiTags('Admin — Tenants')
@ApiBearerAuth()
@AppContexts(AppContext.ADMIN)
@Controller('admin/tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  // ── List & detail ──────────────────────────────────────────────

  @Get()
  @RequirePermissions(Permission.TENANT_READ)
  @ApiOperation({ summary: 'List all tenants with filters and pagination' })
  findAll(@Query() query: TenantQueryDto) {
    return this.tenantsService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions(Permission.TENANT_READ)
  @ApiOperation({ summary: 'Get full tenant details by ID' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.tenantsService.findOne(id);
  }

  @Get(':id/stats')
  @RequirePermissions(Permission.TENANT_READ)
  @ApiOperation({
    summary:
      "Get live stats from the tenant's schema (staff, patients, appointments)",
  })
  getTenantStats(@Param('id', ParseUUIDPipe) id: string) {
    return this.tenantsService.getTenantStats(id);
  }

  // ── Create ────────────────────────────────────────────────────

  @Post()
  @RequirePermissions(Permission.TENANT_CREATE)
  @ApiOperation({
    summary: 'Create a new tenant and provision its schema + owner account',
  })
  create(@Body() dto: CreateTenantDto) {
    return this.tenantsService.create(dto);
  }

  // ── Update ────────────────────────────────────────────────────

  @Patch(':id')
  @RequirePermissions(Permission.TENANT_UPDATE)
  @ApiOperation({ summary: 'Update tenant profile information' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateTenantDto) {
    return this.tenantsService.update(id, dto);
  }

  @Patch(':id/subscription')
  @RequirePermissions(Permission.TENANT_MANAGE)
  @ApiOperation({ summary: 'Change subscription plan and/or expiry date' })
  updateSubscription(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSubscriptionDto,
  ) {
    return this.tenantsService.updateSubscription(id, dto);
  }

  // ── Status transitions ────────────────────────────────────────

  @Post(':id/activate')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permission.TENANT_MANAGE)
  @ApiOperation({ summary: 'Activate a pending or suspended tenant' })
  activate(@Param('id', ParseUUIDPipe) id: string) {
    return this.tenantsService.activate(id);
  }

  @Post(':id/suspend')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permission.TENANT_MANAGE)
  @ApiOperation({
    summary:
      'Suspend an active tenant — immediate effect via cache invalidation',
  })
  suspend(@Param('id', ParseUUIDPipe) id: string) {
    return this.tenantsService.suspend(id);
  }

  @Post(':id/terminate')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permission.TENANT_MANAGE)
  @ApiOperation({ summary: 'Permanently terminate a tenant (irreversible)' })
  terminate(@Param('id', ParseUUIDPipe) id: string) {
    return this.tenantsService.terminate(id);
  }

  @Post(':id/retry-provisioning')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permission.TENANT_MANAGE)
  @ApiOperation({ summary: 'Retry schema provisioning for a PENDING tenant' })
  retryProvisioning(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RetryProvisioningDto,
  ) {
    return this.tenantsService.retryProvisioning(id, dto);
  }
}
