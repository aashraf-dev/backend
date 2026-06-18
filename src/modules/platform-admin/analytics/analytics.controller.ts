import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { AnalyticsService } from './analytics.service';
import { AnalyticsQueryDto } from './dto';
import { AppContexts } from '../../../core/decorators/app-contexts.decorator';
import { RequirePermissions } from '../../../core/decorators/require-permissions.decorator';
import { AppContext } from '../../../shared/enums/app-context.enum';
import { Permission } from '../../../shared/enums/permission.enum';

@ApiTags('Admin — Analytics')
@ApiBearerAuth()
@AppContexts(AppContext.ADMIN)
@RequirePermissions(Permission.REPORT_VIEW)
@Controller('admin/analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('overview')
  @ApiOperation({
    summary: 'Platform overview — tenant counts, subscriptions, user stats',
  })
  getOverview() {
    return this.analyticsService.getOverview();
  }

  @Get('growth')
  @ApiOperation({
    summary: 'Monthly tenant growth trend over a configurable period',
  })
  getTenantGrowth(@Query() query: AnalyticsQueryDto) {
    return this.analyticsService.getTenantGrowth(query);
  }
}
