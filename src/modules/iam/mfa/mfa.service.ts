import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TOTP, NobleCryptoPlugin, ScureBase32Plugin } from 'otplib';
import * as qrcode from 'qrcode';
import { createHash, randomBytes } from 'crypto';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { DATA_SOURCE_PLATFORM } from 'src/shared/constants/data-source.constants';
import { TenantConnectionService } from '../../../database/tenant-connection.service';
import { PlatformUserEntity } from 'src/database/entities/platform';
import { UserEntity } from '../../../database/entities/tenant/user.entity';
import { MfaSettingEntity } from '../../../database/entities/tenant/mfa-setting.entity';
import { RedisService } from '../../../shared/redis/redis.service';
import { CacheKeys } from '../../../shared/constants/cache-keys.constant';
import { CacheTTL } from '../../../shared/constants/cache-ttl.constant';
import {
  IMfaEnableResult,
  IMfaSetupResult,
} from '../auth/interfaces/auth-result.interface';

const MAX_MFA_ATTEMPTS = 5;
const RECOVERY_CODE_COUNT = 10;

@Injectable()
export class MfaService {
  private readonly logger = new Logger(MfaService.name);
  private readonly appName: string;
  /** otplib v12 TOTP instance with required crypto + base32 plugins */
  private readonly totp: TOTP;

  constructor(
    private readonly configService: ConfigService,
    private readonly tenantConn: TenantConnectionService,
    private readonly redis: RedisService,
    @InjectDataSource(DATA_SOURCE_PLATFORM)
    private readonly platformDs: DataSource,
  ) {
    this.appName = this.configService.get<string>('auth.mfaAppName')!;

    // Configure TOTP — accept 1 step before/after for clock drift
    this.totp = new TOTP({
      crypto: new NobleCryptoPlugin(),
      base32: new ScureBase32Plugin(),
    });
  }

  // ── Setup (step 1 — generate secret + QR code) ───────────────────

  async initiateSetup(
    userId: string,
    email: string,
    tenantSchema: string | null,
  ): Promise<IMfaSetupResult> {
    const secret = this.totp.generateSecret();
    const otpAuthUrl = this.totp.toURI({
      label: email,
      issuer: this.appName,
      secret,
    });

    // Temporarily store unverified secret — overwritten on verify+enable
    if (tenantSchema) {
      await this.tenantConn.runInTenantSchema(tenantSchema, async (em) => {
        let setting = await em.findOne(MfaSettingEntity, { where: { userId } });

        if (setting?.isVerified) {
          throw new BadRequestException(
            'MFA is already enabled. Disable it first.',
          );
        }

        if (!setting) {
          setting = em.create(MfaSettingEntity, {
            userId,
            secret,
            isVerified: false,
            recoveryCodes: [],
          });
        } else {
          setting.secret = secret;
        }

        await em.save(MfaSettingEntity, setting);
      });
    } else {
      const repo = this.platformDs.getRepository(PlatformUserEntity);
      const user = await repo.findOne({
        where: { id: userId },
        select: { id: true, mfaEnabled: true },
      });

      if (user?.mfaEnabled) {
        throw new BadRequestException(
          'MFA is already enabled. Disable it first.',
        );
      }

      await repo.update(userId, { mfaSecret: secret });
    }

    const qrCodeDataUrl = await qrcode.toDataURL(otpAuthUrl);

    return {
      qrCodeDataUrl,
      manualEntryKey: this.formatSecretForDisplay(secret),
    };
  }

  // ── Setup (step 2 — verify code and activate) ────────────────────

  async confirmSetupAndEnable(
    userId: string,
    totpCode: string,
    tenantSchema: string | null,
  ): Promise<IMfaEnableResult> {
    const secret = await this.getPendingSecret(userId, tenantSchema);

    if (!secret) {
      throw new BadRequestException(
        'MFA setup not initiated. Call /auth/mfa/setup first.',
      );
    }

    if (!(await this.verifyTotpCode(totpCode, secret))) {
      throw new BadRequestException(
        'Invalid TOTP code. Please check your authenticator app.',
      );
    }

    const recoveryCodes = this.generateRecoveryCodes();
    const hashedCodes = recoveryCodes.map((c) => this.hashRecoveryCode(c));

    if (tenantSchema) {
      await this.tenantConn.runInTenantSchema(tenantSchema, async (em) => {
        await em.update(
          MfaSettingEntity,
          { userId },
          {
            secret,
            isVerified: true,
            recoveryCodes: hashedCodes,
            verifiedAt: new Date(),
          },
        );
        await em.update(UserEntity, userId, { mfaEnabled: true });
      });
    } else {
      await this.platformDs.getRepository(PlatformUserEntity).update(userId, {
        mfaEnabled: true,
        // secret already stored in initiateSetup
      });
    }

    await this.invalidateUserCache(userId, tenantSchema);

    return { recoveryCodes }; // Returned ONCE — user must save these
  }

  // ── Verify during login ──────────────────────────────────────────

  async verifyLoginCode(
    userId: string,
    code: string,
    tenantSchema: string | null,
  ): Promise<boolean> {
    await this.checkMfaAttemptLimit(userId);

    const { secret, recoveryCodes } = await this.getMfaCredentials(
      userId,
      tenantSchema,
    );

    if (!secret) {
      throw new BadRequestException('MFA is not configured for this account');
    }

    // Try TOTP first
    if (this.isStandardTotpCode(code)) {
      if (await this.verifyTotpCode(code, secret)) {
        await this.clearMfaAttempts(userId);
        return true;
      }
    }

    // Try recovery code (8-char format: XXXXXXXX or XXXX-XXXX)
    if (this.isRecoveryCodeFormat(code)) {
      const normalizedCode = code.replace(/-/g, '').toUpperCase();
      const hash = this.hashRecoveryCode(normalizedCode);

      const matchIndex = recoveryCodes.indexOf(hash);
      if (matchIndex !== -1) {
        // Recovery codes are single-use — remove after successful use
        await this.consumeRecoveryCode(userId, matchIndex, tenantSchema);
        await this.clearMfaAttempts(userId);
        this.logger.warn(`Recovery code used for user ${userId}`);
        return true;
      }
    }

    // Failed attempt
    await this.incrementMfaAttempts(userId);
    return false;
  }

  // ── Disable MFA ──────────────────────────────────────────────────

  async disable(userId: string, tenantSchema: string | null): Promise<void> {
    if (tenantSchema) {
      await this.tenantConn.runInTenantSchema(tenantSchema, async (em) => {
        await em.delete(MfaSettingEntity, { userId });
        await em.update(UserEntity, userId, {
          mfaEnabled: false,
          mfaSecret: null,
        });
      });
    } else {
      await this.platformDs.getRepository(PlatformUserEntity).update(userId, {
        mfaEnabled: false,
        mfaSecret: null,
      });
    }

    await this.invalidateUserCache(userId, tenantSchema);
  }

  // ── Private helpers ──────────────────────────────────────────────

  private async verifyTotpCode(code: string, secret: string): Promise<boolean> {
    try {
      const result = await this.totp.verify(code, {
        secret,
        epochTolerance: 30,
      });
      return result?.valid ?? false;
    } catch {
      return false;
    }
  }

  private async getPendingSecret(
    userId: string,
    tenantSchema: string | null,
  ): Promise<string | null> {
    if (tenantSchema) {
      return this.tenantConn.runInTenantSchema(tenantSchema, async (em) => {
        const setting = await em.findOne(MfaSettingEntity, {
          where: { userId, isVerified: false },
          select: { secret: true },
        });
        return setting?.secret ?? null;
      });
    }

    const user = await this.platformDs
      .getRepository(PlatformUserEntity)
      .findOne({
        where: { id: userId },
        select: { mfaSecret: true, mfaEnabled: true },
      });

    return user?.mfaEnabled ? null : (user?.mfaSecret ?? null);
  }

  private async getMfaCredentials(
    userId: string,
    tenantSchema: string | null,
  ): Promise<{ secret: string | null; recoveryCodes: string[] }> {
    if (tenantSchema) {
      return this.tenantConn.runInTenantSchema(tenantSchema, async (em) => {
        const setting = await em.findOne(MfaSettingEntity, {
          where: { userId, isVerified: true },
          select: { secret: true, recoveryCodes: true },
        });
        return {
          secret: setting?.secret ?? null,
          recoveryCodes: setting?.recoveryCodes ?? [],
        };
      });
    }

    const user = await this.platformDs
      .getRepository(PlatformUserEntity)
      .findOne({ where: { id: userId }, select: { mfaSecret: true } });

    return { secret: user?.mfaSecret ?? null, recoveryCodes: [] };
  }

  private async consumeRecoveryCode(
    userId: string,
    codeIndex: number,
    tenantSchema: string | null,
  ): Promise<void> {
    if (!tenantSchema) return;

    await this.tenantConn.runInTenantSchema(tenantSchema, async (em) => {
      const setting = await em.findOne(MfaSettingEntity, {
        where: { userId },
        select: { id: true, recoveryCodes: true },
      });
      if (!setting) return;

      setting.recoveryCodes.splice(codeIndex, 1);
      await em.update(MfaSettingEntity, setting.id, {
        recoveryCodes: setting.recoveryCodes,
      });
    });
  }

  private generateRecoveryCodes(): string[] {
    return Array.from({ length: RECOVERY_CODE_COUNT }, () =>
      randomBytes(4).toString('hex').toUpperCase(),
    );
  }

  private hashRecoveryCode(code: string): string {
    return createHash('sha256').update(code.toUpperCase()).digest('hex');
  }

  private formatSecretForDisplay(secret: string): string {
    return secret.match(/.{1,4}/g)?.join(' ') ?? secret;
  }

  private isStandardTotpCode(code: string): boolean {
    return /^\d{6}$/.test(code);
  }

  private isRecoveryCodeFormat(code: string): boolean {
    return /^[A-Fa-f0-9]{8}$/.test(code.replace(/-/g, ''));
  }

  private async checkMfaAttemptLimit(userId: string): Promise<void> {
    const attemptsKey = CacheKeys.MFA_ATTEMPTS(userId);
    const attemptsRaw = await this.redis.get(attemptsKey);
    const attempts = attemptsRaw ? parseInt(attemptsRaw, 10) : 0;

    if (attempts >= MAX_MFA_ATTEMPTS) {
      throw new UnauthorizedException(
        'Too many failed MFA attempts. Please try again in 15 minutes.',
      );
    }
  }

  private async incrementMfaAttempts(userId: string): Promise<void> {
    await this.redis.incrementWithExpiry(
      CacheKeys.MFA_ATTEMPTS(userId),
      CacheTTL.MFA_ATTEMPTS,
    );
  }

  private async clearMfaAttempts(userId: string): Promise<void> {
    await this.redis.del(CacheKeys.MFA_ATTEMPTS(userId));
  }

  private async invalidateUserCache(
    userId: string,
    tenantSchema: string | null,
  ): Promise<void> {
    await this.redis.del(CacheKeys.CURRENT_USER(userId, tenantSchema));
  }
}
