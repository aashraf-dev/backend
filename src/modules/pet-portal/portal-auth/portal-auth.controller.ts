import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { PortalAuthService } from './portal-auth.service';
import { Public } from '../../../core/decorators/public.decorator';
import { AppContexts } from '../../../core/decorators/app-contexts.decorator';
import { CurrentUser } from '../../../core/decorators/current-user.decorator';
import { AppContext } from '../../../shared/enums/app-context.enum';
import type { IJwtPayload } from '../../../shared/interfaces/jwt-payload.interface';
import { RegisterPortalUserDto, UpdateEmailDto } from './dto';

@ApiTags('Portal — Registration & Account')
@AppContexts(AppContext.PORTAL)
@Controller('portal/auth')
export class PortalAuthController {
  constructor(private readonly portalAuthService: PortalAuthService) {}

  /**
   * Self-registration — public endpoint. The tenant is resolved from
   * the subdomain so no extra header needed.
   */
  @Public()
  @Post('register')
  @ApiOperation({
    summary: 'Self-register as a new pet owner at this clinic',
    description:
      "Creates a user account and owner profile in the clinic's tenant schema. " +
      'After registration, use POST /auth/login to obtain tokens.',
  })
  register(@Body() dto: RegisterPortalUserDto) {
    return this.portalAuthService.register(dto);
  }

  @Patch('email')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Change account email (requires current password)' })
  updateEmail(@CurrentUser() user: IJwtPayload, @Body() dto: UpdateEmailDto) {
    return this.portalAuthService.updateEmail(user, dto);
  }
}
