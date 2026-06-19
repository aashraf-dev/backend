import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { OwnerProfileService } from './owner-profile.service';
import { AppContexts } from '../../../core/decorators/app-contexts.decorator';
import { RequirePermissions } from '../../../core/decorators/require-permissions.decorator';
import { CurrentUser } from '../../../core/decorators/current-user.decorator';
import { AppContext } from '../../../shared/enums/app-context.enum';
import { Permission } from '../../../shared/enums/permission.enum';
import type { IJwtPayload } from '../../../shared/interfaces/jwt-payload.interface';
import { UpdateOwnerProfileDto } from './dto';

@ApiTags('Portal — My Profile')
@ApiBearerAuth()
@AppContexts(AppContext.PORTAL)
@Controller('portal/me')
export class OwnerProfileController {
  constructor(private readonly profileService: OwnerProfileService) {}

  @Get()
  @RequirePermissions(Permission.OWN_PETS_READ)
  @ApiOperation({
    summary: 'Get own profile — contact details, address, emergency contact',
  })
  getMyProfile(@CurrentUser() user: IJwtPayload) {
    return this.profileService.getMyProfile(user);
  }

  @Patch()
  @RequirePermissions(Permission.OWN_PETS_READ)
  @ApiOperation({ summary: 'Update own profile details' })
  updateMyProfile(
    @CurrentUser() user: IJwtPayload,
    @Body() dto: UpdateOwnerProfileDto,
  ) {
    return this.profileService.updateMyProfile(user, dto);
  }
}
