import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { AuditService } from './audit.service';
import { AuditQueryDto } from './dto';
import { AppContexts } from '../../../core/decorators/app-contexts.decorator';
import { RequirePermissions } from '../../../core/decorators/require-permissions.decorator';
import { AppContext } from '../../../shared/enums/app-context.enum';
import { Permission } from '../../../shared/enums/permission.enum';

@ApiTags('Admin — Audit Logs')
@ApiBearerAuth()
@AppContexts(AppContext.ADMIN)
@RequirePermissions(Permission.AUDIT_LOG_READ)
@Controller('admin/audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @ApiOperation({
    summary: 'Query platform audit trail with filters',
    description:
      'Immutable audit log of all state-changing API calls across the platform.',
  })
  findAll(@Query() query: AuditQueryDto) {
    return this.auditService.findAll(query);
  }
}
