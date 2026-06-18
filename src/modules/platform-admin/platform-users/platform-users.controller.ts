import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { PlatformUsersService } from './platform-users.service';
import { AppContexts } from '../../../core/decorators/app-contexts.decorator';
import { RequirePermissions } from '../../../core/decorators/require-permissions.decorator';
import { CurrentUser } from '../../../core/decorators/current-user.decorator';
import { AppContext } from '../../../shared/enums/app-context.enum';
import { Permission } from '../../../shared/enums/permission.enum';
import type { IJwtPayload } from '../../../shared/interfaces/jwt-payload.interface';
import {
  CreatePlatformUserDto,
  UpdatePlatformUserDto,
  PlatformUsersQueryDto,
} from './dto';

@ApiTags('Admin — Platform Users')
@ApiBearerAuth()
@AppContexts(AppContext.ADMIN)
@Controller('admin/platform-users')
export class PlatformUsersController {
  constructor(private readonly usersService: PlatformUsersService) {}

  @Get()
  @RequirePermissions(Permission.USER_READ)
  @ApiOperation({ summary: 'List all platform (admin/support) users' })
  findAll(@Query() query: PlatformUsersQueryDto) {
    return this.usersService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions(Permission.USER_READ)
  @ApiOperation({ summary: 'Get platform user by ID' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.findOne(id);
  }

  @Post()
  @RequirePermissions(Permission.USER_MANAGE)
  @ApiOperation({ summary: 'Create a new platform admin or support user' })
  create(
    @Body() dto: CreatePlatformUserDto,
    @CurrentUser() actor: IJwtPayload,
  ) {
    return this.usersService.create(dto, actor);
  }

  @Patch(':id')
  @RequirePermissions(Permission.USER_MANAGE)
  @ApiOperation({ summary: 'Update platform user details or role' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePlatformUserDto,
    @CurrentUser() actor: IJwtPayload,
  ) {
    return this.usersService.update(id, dto, actor);
  }

  @Post(':id/activate')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permission.USER_MANAGE)
  @ApiOperation({ summary: 'Activate a deactivated platform user' })
  activate(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: IJwtPayload,
  ) {
    return this.usersService.setActive(id, true, actor);
  }

  @Post(':id/deactivate')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permission.USER_MANAGE)
  @ApiOperation({
    summary:
      'Deactivate a platform user — immediately invalidates all sessions',
  })
  deactivate(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: IJwtPayload,
  ) {
    return this.usersService.setActive(id, false, actor);
  }
}
