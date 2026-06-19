import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { MyMedicalRecordsService } from './my-medical-records.service';
import { AppContexts } from '../../../core/decorators/app-contexts.decorator';
import { RequirePermissions } from '../../../core/decorators/require-permissions.decorator';
import { CurrentUser } from '../../../core/decorators/current-user.decorator';
import { AppContext } from '../../../shared/enums/app-context.enum';
import { Permission } from '../../../shared/enums/permission.enum';
import type { IJwtPayload } from '../../../shared/interfaces/jwt-payload.interface';
import { PortalMedicalRecordQueryDto } from './dto';

@ApiTags('Portal — My Medical Records')
@ApiBearerAuth()
@AppContexts(AppContext.PORTAL)
@Controller('portal/my-medical-records')
export class MyMedicalRecordsController {
  constructor(private readonly recordsService: MyMedicalRecordsService) {}

  @Get()
  @RequirePermissions(Permission.OWN_MEDICAL_RECORDS_READ)
  @ApiOperation({
    summary: 'List medical records for all owned pets',
    description: 'Read-only. Owners can filter by pet or record type.',
  })
  findAll(
    @Query() query: PortalMedicalRecordQueryDto,
    @CurrentUser() user: IJwtPayload,
  ) {
    return this.recordsService.findAll(query, user);
  }

  @Get(':recordId')
  @RequirePermissions(Permission.OWN_MEDICAL_RECORDS_READ)
  @ApiOperation({
    summary: 'View a single medical record (ownership enforced)',
  })
  findOne(
    @Param('recordId', ParseUUIDPipe) recordId: string,
    @CurrentUser() user: IJwtPayload,
  ) {
    return this.recordsService.findOne(recordId, user);
  }
}
