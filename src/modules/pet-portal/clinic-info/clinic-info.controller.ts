import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { ClinicInfoService } from './clinic-info.service';
import { Public } from '../../../core/decorators/public.decorator';
import { AppContexts } from '../../../core/decorators/app-contexts.decorator';
import { AppContext } from '../../../shared/enums/app-context.enum';

@ApiTags('Portal — Clinic Information')
@AppContexts(AppContext.PORTAL)
@Controller('portal/clinic')
export class ClinicInfoController {
  constructor(private readonly clinicInfoService: ClinicInfoService) {}

  @Public()
  @Get()
  @ApiOperation({
    summary: 'Public clinic info — name, location, contact',
    description: 'No authentication required. Used for clinic landing page.',
  })
  getClinicInfo() {
    return this.clinicInfoService.getClinicInfo();
  }

  @Public()
  @Get('vets')
  @ApiOperation({
    summary: 'List available veterinarians — used in booking flow',
    description: 'Public endpoint. Returns name and designation only — no PII.',
  })
  getAvailableVets() {
    return this.clinicInfoService.getAvailableVets();
  }

  @Public()
  @Get('services')
  @ApiOperation({
    summary: 'List available clinic services — used in booking flow',
    description:
      'Public endpoint. Returns services available for online booking.',
  })
  getAvailableServices() {
    return this.clinicInfoService.getAvailableServices();
  }
}
