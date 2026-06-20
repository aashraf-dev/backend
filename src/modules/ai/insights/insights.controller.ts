import {
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ClsService } from 'nestjs-cls';

import { InsightsService } from './insights.service';
import { AppContexts } from '../../../core/decorators/app-contexts.decorator';
import { RequirePermissions } from '../../../core/decorators/require-permissions.decorator';
import { AppContext } from '../../../shared/enums/app-context.enum';
import { Permission } from '../../../shared/enums/permission.enum';
import { IClsStore } from '../../../core/context/request-context';

@ApiTags('AI — Insights')
@ApiBearerAuth()
@AppContexts(AppContext.CRM)
@Controller('ai/insights')
export class InsightsController {
  constructor(
    private readonly insightsService: InsightsService,
    private readonly cls: ClsService<IClsStore>,
  ) {}

  @Get()
  @RequirePermissions(Permission.APPOINTMENT_READ)
  @ApiOperation({ summary: 'Get AI insights for this clinic' })
  getInsights(@Query('includeDismissed') includeDismissed?: string) {
    const schema = this.cls.get('TENANT_SCHEMA')!;
    return this.insightsService.getInsights(
      schema,
      includeDismissed === 'true',
    );
  }

  @Patch(':id/read')
  @RequirePermissions(Permission.APPOINTMENT_READ)
  @ApiOperation({ summary: 'Mark an insight as read' })
  markRead(@Param('id', ParseUUIDPipe) id: string) {
    const schema = this.cls.get('TENANT_SCHEMA')!;
    return this.insightsService.markRead(schema, id);
  }

  @Delete(':id')
  @RequirePermissions(Permission.APPOINTMENT_READ)
  @ApiOperation({ summary: 'Dismiss an insight' })
  dismiss(@Param('id', ParseUUIDPipe) id: string) {
    const schema = this.cls.get('TENANT_SCHEMA')!;
    return this.insightsService.dismiss(schema, id);
  }
}
