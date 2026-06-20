import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ClsService } from 'nestjs-cls';

import { SoapService } from './soap.service';
import { AppContexts } from '../../../core/decorators/app-contexts.decorator';
import { RequirePermissions } from '../../../core/decorators/require-permissions.decorator';
import { CurrentUser } from '../../../core/decorators/current-user.decorator';
import { AppContext } from '../../../shared/enums/app-context.enum';
import { Permission } from '../../../shared/enums/permission.enum';
import type { IJwtPayload } from '../../../shared/interfaces/jwt-payload.interface';
import { IClsStore } from '../../../core/context/request-context';
import { GenerateSoapDto, ApproveSoapDto } from './dto';

@ApiTags('AI — SOAP Engine')
@ApiBearerAuth()
@AppContexts(AppContext.CRM)
@Controller('ai/soap')
export class SoapController {
  constructor(
    private readonly soapService: SoapService,
    private readonly cls: ClsService<IClsStore>,
  ) {}

  @Post()
  @RequirePermissions(Permission.MEDICAL_RECORD_CREATE)
  @ApiOperation({
    summary: 'Generate AI SOAP draft from text, audio, or video',
    description: `
      For text input: provide rawText with consultation notes.
      For audio/video: first upload the file to Azure Blob and provide mediaUrl.
      Returns a draft requiring vet approval — never published directly.
    `,
  })
  generate(@Body() dto: GenerateSoapDto, @CurrentUser() vet: IJwtPayload) {
    return this.soapService.generate(dto, vet);
  }

  @Patch(':draftId/approve')
  @RequirePermissions(Permission.MEDICAL_RECORD_UPDATE)
  @ApiOperation({
    summary:
      'Approve a SOAP draft (vet only — mandatory before portal publication)',
  })
  approve(
    @Param('draftId', ParseUUIDPipe) draftId: string,
    @Body() dto: ApproveSoapDto,
    @CurrentUser() vet: IJwtPayload,
  ) {
    return this.soapService.approve(draftId, dto, vet);
  }

  @Get()
  @RequirePermissions(Permission.MEDICAL_RECORD_READ)
  @ApiOperation({
    summary: 'List SOAP drafts for current vet or a specific pet',
  })
  list(@CurrentUser() vet: IJwtPayload, @Query('petId') petId?: string) {
    const schema = this.cls.get('TENANT_SCHEMA')!;
    return this.soapService.list(schema, vet.sub, petId);
  }
}
