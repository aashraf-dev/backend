import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  RawBodyRequest,
  Req,
  Res,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { ClsService } from 'nestjs-cls';

import { ReceptionistService } from './receptionist.service';
import { Public } from '../../../core/decorators/public.decorator';
import { IClsStore } from '../../../core/context/request-context';

@ApiTags('AI — Receptionist (Twilio Webhooks)')
@Controller('ai/receptionist')
export class ReceptionistController {
  constructor(
    private readonly receptionist: ReceptionistService,
    private readonly cls: ClsService<IClsStore>,
  ) {}

  /**
   * Twilio calls this webhook when an inbound call is received.
   * Must return TwiML (application/xml).
   */
  @Public()
  @Post('inbound')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Twilio inbound call webhook — returns TwiML' })
  async handleInbound(
    @Body() body: Record<string, string>,
    @Res() res: Response,
  ) {
    const schema = this.cls.get('TENANT_SCHEMA')!;
    const tenantId = this.cls.get('TENANT_ID')!;
    const tenantName = this.cls.get('TENANT_NAME') ?? 'the clinic';

    const twiml = await this.receptionist.handleInboundCall(
      body['CallSid'],
      body['From'],
      schema,
      tenantId,
      tenantName,
    );

    res.type('text/xml').send(twiml);
  }

  /**
   * Twilio calls this after gathering caller speech.
   * callSid is embedded in the action URL set during inbound handling.
   */
  @Public()
  @Post('gather/:callSid')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Twilio gather result webhook — processes caller speech',
  })
  async handleGather(
    @Param('callSid') callSid: string,
    @Body() body: Record<string, string>,
    @Res() res: Response,
  ) {
    const schema = this.cls.get('TENANT_SCHEMA')!;
    const tenantId = this.cls.get('TENANT_ID')!;
    const tenantName = this.cls.get('TENANT_NAME') ?? 'the clinic';

    const speechResult = body['SpeechResult'] ?? '';

    const twiml = await this.receptionist.handleGather(
      callSid,
      body['From'],
      speechResult,
      schema,
      tenantId,
      tenantName,
    );

    res.type('text/xml').send(twiml);
  }
}
