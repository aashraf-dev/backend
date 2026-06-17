import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'crypto';
import { IJwtPayload } from '../../../shared/interfaces/jwt-payload.interface';
import { AppContext } from '../../../shared/enums/app-context.enum';
import { UserType } from '../../../shared/enums/user-type.enum';

export interface ITokenPair {
  accessToken: string;
  refreshToken: string; // plaintext — send to client once
  refreshTokenHash: string; // SHA-256 — persist in DB
  expiresIn: number; // seconds until access token expires
}

@Injectable()
export class TokenService {
  private readonly accessSecret: string;
  private readonly refreshSecret: string;
  private readonly accessExpiry: string;
  private readonly refreshExpiry: string;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    this.accessSecret = this.configService.get<string>(
      'auth.jwt.accessSecret',
    )!;
    this.refreshSecret = this.configService.get<string>(
      'auth.jwt.refreshSecret',
    )!;
    this.accessExpiry = this.configService.get<string>(
      'auth.jwt.accessExpiry',
    )!;
    this.refreshExpiry = this.configService.get<string>(
      'auth.jwt.refreshExpiry',
    )!;
  }

  // ── Token issuance ───────────────────────────────────────────────

  issueTokenPair(params: {
    userId: string;
    tenantId: string | null;
    tenantSchema: string | null;
    appContext: AppContext;
    userType: UserType;
    permissions: string[];
    sessionId: string;
  }): ITokenPair {
    const payload: IJwtPayload = {
      sub: params.userId,
      tenantId: params.tenantId,
      tenantSchema: params.tenantSchema,
      appContext: params.appContext,
      userType: params.userType,
      permissions: params.permissions,
      sessionId: params.sessionId,
      tokenType: 'access',
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.accessSecret,
      expiresIn: this.accessExpiry,
    });

    const { plaintext: refreshToken, hash: refreshTokenHash } =
      this.generateRefreshToken();

    return {
      accessToken,
      refreshToken,
      refreshTokenHash,
      expiresIn: this.parseExpirySeconds(this.accessExpiry),
    };
  }

  issueMfaPendingToken(params: {
    userId: string;
    tenantId: string | null;
    tenantSchema: string | null;
    appContext: AppContext;
    userType: UserType;
  }): { token: string; expiresIn: number } {
    const payload: IJwtPayload = {
      sub: params.userId,
      tenantId: params.tenantId,
      tenantSchema: params.tenantSchema,
      appContext: params.appContext,
      userType: params.userType,
      permissions: [],
      sessionId: 'mfa_pending',
      tokenType: 'mfa_pending',
    };

    const token = this.jwtService.sign(payload, {
      secret: this.accessSecret,
      expiresIn: '5m',
    });

    return { token, expiresIn: 300 };
  }

  // ── Token verification ───────────────────────────────────────────

  verifyMfaPendingToken(token: string): IJwtPayload | null {
    try {
      const payload = this.jwtService.verify<IJwtPayload>(token, {
        secret: this.accessSecret,
      });
      return payload.tokenType === 'mfa_pending' ? payload : null;
    } catch {
      return null;
    }
  }

  verifyRefreshToken(plaintext: string, storedHash: string): boolean {
    return this.hashValue(plaintext) === storedHash;
  }

  // ── Helpers ──────────────────────────────────────────────────────

  generateRefreshToken(): { plaintext: string; hash: string } {
    const plaintext = randomBytes(64).toString('hex');
    return { plaintext, hash: this.hashValue(plaintext) };
  }

  hashValue(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }

  get refreshExpirySeconds(): number {
    return this.parseExpirySeconds(this.refreshExpiry);
  }

  private parseExpirySeconds(expiry: string): number {
    const unit = expiry.slice(-1);
    const value = parseInt(expiry.slice(0, -1), 10);
    const map: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
    return (map[unit] ?? 60) * value;
  }
}
