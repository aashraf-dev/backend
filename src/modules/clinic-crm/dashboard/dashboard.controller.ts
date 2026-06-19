import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { AppContexts } from '../../../core/decorators/app-contexts.decorator';
import { RequirePermissions } from '../../../core/decorators/require-permissions.decorator';
import { CurrentUser } from '../../../core/decorators/current-user.decorator';
import { AppContext } from '../../../shared/enums/app-context.enum';
import { Permission } from '../../../shared/enums/permission.enum';
import type { IJwtPayload } from '../../../shared/interfaces/jwt-payload.interface';

@ApiTags('CRM — Dashboard')
@ApiBearerAuth()
@AppContexts(AppContext.CRM)
@Controller('crm/dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  @RequirePermissions(Permission.APPOINTMENT_READ)
  @ApiOperation({
    summary:
      "Clinic dashboard — live stats scoped to the requesting user's role",
  })
  getStats(@CurrentUser() actor: IJwtPayload) {
    return this.dashboardService.getStats(actor);
  }
}
