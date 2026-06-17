import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';

import { AuthService } from './auth.service';
import { Public } from '../../../core/decorators/public.decorator';
import { CurrentUser } from '../../../core/decorators/current-user.decorator';
import type { IJwtPayload } from '../../../shared/interfaces/jwt-payload.interface';

import {
  ChangePasswordDto,
  DisableMfaDto,
  ForgotPasswordDto,
  LoginDto,
  RefreshTokenDto,
  ResetPasswordDto,
  VerifyMfaDto,
  VerifyMfaSetupDto,
} from './dto';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ── Login / Logout ───────────────────────────────────────────────

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login — works across all app contexts' })
  login(@Body() dto: LoginDto, @Req() req: Request) {
    return this.authService.login(dto, req);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rotate access + refresh token pair' })
  refresh(@Body() dto: RefreshTokenDto, @Req() req: Request) {
    return this.authService.refreshToken(dto, req);
  }

  @Delete('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke current session' })
  logout(@CurrentUser() user: IJwtPayload) {
    return this.authService.logout(user);
  }

  @Delete('logout/all')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke all active sessions for this user' })
  logoutAll(@CurrentUser() user: IJwtPayload) {
    return this.authService.logoutAll(user);
  }

  // ── MFA ──────────────────────────────────────────────────────────

  @Public()
  @Post('mfa/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Complete login with TOTP code or recovery code' })
  verifyMfa(@Body() dto: VerifyMfaDto, @Req() req: Request) {
    return this.authService.verifyMfa(dto, req);
  }

  @Get('mfa/setup')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Initiate MFA setup — returns QR code and manual key',
  })
  setupMfa(@CurrentUser() user: IJwtPayload) {
    return this.authService.setupMfa(user);
  }

  @Post('mfa/setup/confirm')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Confirm TOTP code and activate MFA — returns one-time recovery codes',
  })
  confirmMfaSetup(
    @CurrentUser() user: IJwtPayload,
    @Body() dto: VerifyMfaSetupDto,
  ) {
    return this.authService.confirmMfaSetup(user, dto);
  }

  @Delete('mfa')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Disable MFA (requires current password)' })
  disableMfa(@CurrentUser() user: IJwtPayload, @Body() dto: DisableMfaDto) {
    return this.authService.disableMfa(user, dto);
  }

  // ── Password ─────────────────────────────────────────────────────

  @Post('password/change')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change password (must be authenticated)' })
  changePassword(
    @CurrentUser() user: IJwtPayload,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(user, dto);
  }

  @Public()
  @Post('password/forgot')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Request password reset email' })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Public()
  @Post('password/reset')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Reset password using token from email' })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  // ── Profile & sessions ───────────────────────────────────────────

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get current authenticated user profile + permissions',
  })
  getMe(@CurrentUser() user: IJwtPayload) {
    return this.authService.getCurrentUser(user);
  }

  @Get('sessions')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all active sessions for the current user' })
  getSessions(@CurrentUser() user: IJwtPayload) {
    return this.authService.getSessions(user);
  }

  @Delete('sessions/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke a specific session by ID' })
  revokeSession(
    @Param('id', ParseUUIDPipe) sessionId: string,
    @CurrentUser() user: IJwtPayload,
  ) {
    return this.authService.revokeSession(sessionId, user);
  }
}
