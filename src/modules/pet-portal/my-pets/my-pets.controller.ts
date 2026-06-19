import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { MyPetsService } from './my-pets.service';
import { AppContexts } from '../../../core/decorators/app-contexts.decorator';
import { RequirePermissions } from '../../../core/decorators/require-permissions.decorator';
import { CurrentUser } from '../../../core/decorators/current-user.decorator';
import { AppContext } from '../../../shared/enums/app-context.enum';
import { Permission } from '../../../shared/enums/permission.enum';
import type { IJwtPayload } from '../../../shared/interfaces/jwt-payload.interface';
import { RegisterPetDto } from './dto';

@ApiTags('Portal — My Pets')
@ApiBearerAuth()
@AppContexts(AppContext.PORTAL)
@Controller('portal/my-pets')
export class MyPetsController {
  constructor(private readonly myPetsService: MyPetsService) {}

  @Get()
  @RequirePermissions(Permission.OWN_PETS_READ)
  @ApiOperation({ summary: 'List all pets registered to this owner' })
  findAll(@CurrentUser() user: IJwtPayload) {
    return this.myPetsService.findAll(user);
  }

  @Get(':petId')
  @RequirePermissions(Permission.OWN_PETS_READ)
  @ApiOperation({ summary: 'Get a single pet profile (ownership enforced)' })
  findOne(
    @Param('petId', ParseUUIDPipe) petId: string,
    @CurrentUser() user: IJwtPayload,
  ) {
    return this.myPetsService.findOne(petId, user);
  }

  @Post()
  @RequirePermissions(Permission.OWN_PETS_READ)
  @ApiOperation({ summary: "Register a new pet under this owner's account" })
  register(@Body() dto: RegisterPetDto, @CurrentUser() user: IJwtPayload) {
    return this.myPetsService.register(dto, user);
  }

  @Patch(':petId')
  @RequirePermissions(Permission.OWN_PETS_READ)
  @ApiOperation({ summary: "Update a pet's basic details" })
  update(
    @Param('petId', ParseUUIDPipe) petId: string,
    @Body() dto: Partial<RegisterPetDto>,
    @CurrentUser() user: IJwtPayload,
  ) {
    return this.myPetsService.update(petId, dto, user);
  }
}
