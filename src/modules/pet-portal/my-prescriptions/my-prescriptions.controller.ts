import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { MyPrescriptionsService } from './my-prescriptions.service';
import { AppContexts } from '../../../core/decorators/app-contexts.decorator';
import { RequirePermissions } from '../../../core/decorators/require-permissions.decorator';
import { CurrentUser } from '../../../core/decorators/current-user.decorator';
import { AppContext } from '../../../shared/enums/app-context.enum';
import { Permission } from '../../../shared/enums/permission.enum';
import type { IJwtPayload } from '../../../shared/interfaces/jwt-payload.interface';
import { PortalPrescriptionQueryDto } from './dto';

@ApiTags('Portal — My Prescriptions')
@ApiBearerAuth()
@AppContexts(AppContext.PORTAL)
@Controller('portal/my-prescriptions')
export class MyPrescriptionsController {
  constructor(private readonly rxService: MyPrescriptionsService) {}

  @Get()
  @RequirePermissions(Permission.OWN_PRESCRIPTIONS_READ)
  @ApiOperation({
    summary: 'List all prescriptions for owned pets',
    description: 'Read-only. Filter by pet or status.',
  })
  findAll(
    @Query() query: PortalPrescriptionQueryDto,
    @CurrentUser() user: IJwtPayload,
  ) {
    return this.rxService.findAll(query, user);
  }

  @Get(':prescriptionId')
  @RequirePermissions(Permission.OWN_PRESCRIPTIONS_READ)
  @ApiOperation({ summary: 'View a single prescription with full details' })
  findOne(
    @Param('prescriptionId', ParseUUIDPipe) prescriptionId: string,
    @CurrentUser() user: IJwtPayload,
  ) {
    return this.rxService.findOne(prescriptionId, user);
  }
}
