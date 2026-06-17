import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, IsNull, MoreThan } from 'typeorm';

import { DATA_SOURCE_PLATFORM } from 'src/shared/constants/data-source.constants';
import { TenantConnectionService } from '../../../database/tenant-connection.service';
import { PlatformSessionEntity } from '../../../database/entities/platform/platform-session.entity';
import { SessionEntity } from '../../../database/entities/tenant/session.entity';
import { AppContext } from '../../../shared/enums/app-context.enum';
import { RedisService } from '../../../shared/redis/redis.service';
import { CacheKeys } from '../../../shared/constants/cache-keys.constant';
import { CacheTTL } from '../../../shared/constants/cache-ttl.constant';
import { ISessionInfo } from '../auth/interfaces/auth-result.interface';
import { TokenService } from '../token/token.service';

export interface INormalizedSession {
  id: string;
  userId: string;
  appContext: AppContext;
  ipAddress: string;
  userAgent: string | null;
  expiresAt: Date;
  revokedAt: Date | null;
  createdAt: Date;
}

export interface ICreateSessionParams {
  userId: string;
  refreshTokenHash: string;
  appContext: AppContext;
  ipAddress: string;
  userAgent: string | null;
  tenantSchema: string | null;
}

/** Max concurrent sessions per user — oldest revoked when exceeded */
const MAX_SESSIONS_PER_USER = 5;
const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_DURATION_MS = 30 * 60 * 1000; // 30 minutes

@Injectable()
export class SessionService {
  private readonly logger = new Logger(SessionService.name);

  constructor(
    @InjectDataSource(DATA_SOURCE_PLATFORM)
    private readonly platformDs: DataSource,
    private readonly tenantConn: TenantConnectionService,
    private readonly redis: RedisService,
    private readonly tokenService: TokenService,
  ) {}

  // ── Session creation ─────────────────────────────────────────────

  async create(params: ICreateSessionParams): Promise<string> {
    const expiresAt = new Date(
      Date.now() + this.tokenService.refreshExpirySeconds * 1000,
    );

    const sessionId = await (params.tenantSchema
      ? this.createTenantSession(params, expiresAt)
      : this.createPlatformSession(params, expiresAt));

    await this.cacheSession(
      sessionId,
      params.userId,
      params.tenantSchema,
      params.appContext,
    );

    return sessionId;
  }

  // ── Session lookup ───────────────────────────────────────────────

  async findByRefreshTokenHash(
    tokenHash: string,
    tenantSchema: string | null,
  ): Promise<INormalizedSession | null> {
    if (tenantSchema) {
      return this.tenantConn.runInTenantSchema(tenantSchema, async (em) => {
        const session = await em.findOne(SessionEntity, {
          where: {
            refreshTokenHash: tokenHash,
            revokedAt: IsNull(),
            expiresAt: MoreThan(new Date()),
          },
        });
        return session ? this.normalizeTenantSession(session) : null;
      });
    }

    const session = await this.platformDs
      .getRepository(PlatformSessionEntity)
      .findOne({
        where: {
          refreshTokenHash: tokenHash,
          revokedAt: IsNull(),
          expiresAt: MoreThan(new Date()),
        },
      });
    return session ? this.normalizePlatformSession(session) : null;
  }

  async isSessionValid(sessionId: string): Promise<boolean> {
    return this.redis.exists(CacheKeys.SESSION(sessionId));
  }

  // ── Session revocation ───────────────────────────────────────────

  async revoke(sessionId: string, tenantSchema: string | null): Promise<void> {
    await this.redis.del(CacheKeys.SESSION(sessionId));

    if (tenantSchema) {
      await this.tenantConn.runInTenantSchema(tenantSchema, async (em) => {
        await em.update(SessionEntity, sessionId, { revokedAt: new Date() });
      });
    } else {
      await this.platformDs
        .getRepository(PlatformSessionEntity)
        .update(sessionId, { revokedAt: new Date() });
    }
  }

  async revokeAllForUser(
    userId: string,
    tenantSchema: string | null,
    exceptSessionId?: string,
  ): Promise<void> {
    // Clear all cached sessions for this user via pattern
    await this.redis.deleteByPattern(`auth:session:*`);

    const now = new Date();

    if (tenantSchema) {
      await this.tenantConn.runInTenantSchema(tenantSchema, async (em) => {
        const qb = em
          .createQueryBuilder()
          .update(SessionEntity)
          .set({ revokedAt: now })
          .where('user_id = :userId AND revoked_at IS NULL', { userId });

        if (exceptSessionId) {
          qb.andWhere('id != :exceptSessionId', { exceptSessionId });
        }

        await qb.execute();
      });
    } else {
      const qb = this.platformDs
        .getRepository(PlatformSessionEntity)
        .createQueryBuilder()
        .update()
        .set({ revokedAt: now })
        .where('user_id = :userId AND revoked_at IS NULL', { userId });

      if (exceptSessionId) {
        qb.andWhere('id != :exceptSessionId', { exceptSessionId });
      }

      await qb.execute();
    }
  }

  // ── Refresh token rotation ───────────────────────────────────────

  async rotateRefreshToken(
    sessionId: string,
    newRefreshTokenHash: string,
    tenantSchema: string | null,
    userId: string,
    appContext: AppContext,
  ): Promise<void> {
    const newExpiresAt = new Date(
      Date.now() + this.tokenService.refreshExpirySeconds * 1000,
    );

    if (tenantSchema) {
      await this.tenantConn.runInTenantSchema(tenantSchema, async (em) => {
        await em.update(SessionEntity, sessionId, {
          refreshTokenHash: newRefreshTokenHash,
          expiresAt: newExpiresAt,
        });
      });
    } else {
      await this.platformDs
        .getRepository(PlatformSessionEntity)
        .update(sessionId, {
          refreshTokenHash: newRefreshTokenHash,
          expiresAt: newExpiresAt,
        });
    }

    await this.cacheSession(sessionId, userId, tenantSchema, appContext);
  }

  // ── Session listing ──────────────────────────────────────────────

  async listForUser(
    userId: string,
    tenantSchema: string | null,
    currentSessionId: string,
  ): Promise<ISessionInfo[]> {
    const sessions = await (tenantSchema
      ? this.getTenantSessions(userId, tenantSchema)
      : this.getPlatformSessions(userId));

    return sessions.map((s) => ({
      id: s.id,
      appContext: s.appContext,
      ipAddress: s.ipAddress,
      userAgent: s.userAgent,
      createdAt: s.createdAt,
      expiresAt: s.expiresAt,
      isCurrent: s.id === currentSessionId,
    }));
  }

  // ── Account lock helpers ─────────────────────────────────────────

  computeLockStatus(
    failedAttempts: number,
    lockedUntil: Date | null,
  ): { isLocked: boolean; lockedUntil: Date | null } {
    if (lockedUntil && lockedUntil > new Date()) {
      return { isLocked: true, lockedUntil };
    }

    if (failedAttempts >= MAX_LOGIN_ATTEMPTS) {
      const newLockedUntil = new Date(Date.now() + LOCK_DURATION_MS);
      return { isLocked: true, lockedUntil: newLockedUntil };
    }

    return { isLocked: false, lockedUntil: null };
  }

  shouldLockAfterFailure(currentFailedAttempts: number): boolean {
    return currentFailedAttempts + 1 >= MAX_LOGIN_ATTEMPTS;
  }

  // ── Private ──────────────────────────────────────────────────────

  private async createPlatformSession(
    params: ICreateSessionParams,
    expiresAt: Date,
  ): Promise<string> {
    const repo = this.platformDs.getRepository(PlatformSessionEntity);

    await this.enforceSessionLimit(params.userId, null);

    const session = repo.create({
      userId: params.userId,
      refreshTokenHash: params.refreshTokenHash,
      appContext: params.appContext,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      expiresAt,
    } as any);

    const saved = await repo.save(session as any);
    return Array.isArray(saved) ? saved[0].id : saved.id;
  }

  private async createTenantSession(
    params: ICreateSessionParams,
    expiresAt: Date,
  ): Promise<string> {
    return this.tenantConn.runInTenantSchema(
      params.tenantSchema!,
      async (em) => {
        await this.enforceSessionLimit(params.userId, params.tenantSchema);

        const session = em.create(SessionEntity, {
          userId: params.userId,
          refreshTokenHash: params.refreshTokenHash,
          appContext: params.appContext,
          ipAddress: params.ipAddress,
          userAgent: params.userAgent,
          expiresAt,
        });

        const saved = await em.save(SessionEntity, session);
        return Array.isArray(saved) ? saved[0].id : saved.id;
      },
    );
  }

  private async enforceSessionLimit(
    userId: string,
    tenantSchema: string | null,
  ): Promise<void> {
    if (tenantSchema) {
      await this.tenantConn.runInTenantSchema(tenantSchema, async (em) => {
        const count = await em.count(SessionEntity, {
          where: { userId, revokedAt: IsNull() },
        });

        if (count >= MAX_SESSIONS_PER_USER) {
          // Revoke the oldest active session
          const oldest = await em.findOne(SessionEntity, {
            where: { userId, revokedAt: IsNull() },
            order: { createdAt: 'ASC' },
          });
          if (oldest) {
            await em.update(SessionEntity, oldest.id, {
              revokedAt: new Date(),
            });
            await this.redis.del(CacheKeys.SESSION(oldest.id));
          }
        }
      });
    } else {
      const repo = this.platformDs.getRepository(PlatformSessionEntity);
      const count = await repo.count({
        where: { userId, revokedAt: IsNull() },
      });

      if (count >= MAX_SESSIONS_PER_USER) {
        const oldest = await repo.findOne({
          where: { userId, revokedAt: IsNull() },
          order: { createdAt: 'ASC' },
        });
        if (oldest) {
          await repo.update(oldest.id, { revokedAt: new Date() });
          await this.redis.del(CacheKeys.SESSION(oldest.id));
        }
      }
    }
  }

  private async cacheSession(
    sessionId: string,
    userId: string,
    tenantSchema: string | null,
    appContext: AppContext,
  ): Promise<void> {
    await this.redis.setJson(
      CacheKeys.SESSION(sessionId),
      { userId, tenantSchema, appContext },
      CacheTTL.SESSION,
    );
  }

  private async getPlatformSessions(
    userId: string,
  ): Promise<INormalizedSession[]> {
    const sessions = await this.platformDs
      .getRepository(PlatformSessionEntity)
      .find({
        where: { userId, revokedAt: IsNull(), expiresAt: MoreThan(new Date()) },
        order: { createdAt: 'DESC' },
        take: 20,
      });
    return sessions.map((s) => this.normalizePlatformSession(s));
  }

  private async getTenantSessions(
    userId: string,
    tenantSchema: string,
  ): Promise<INormalizedSession[]> {
    return this.tenantConn.runInTenantSchema(tenantSchema, async (em) => {
      const sessions = await em.find(SessionEntity, {
        where: { userId, revokedAt: IsNull(), expiresAt: MoreThan(new Date()) },
        order: { createdAt: 'DESC' },
        take: 20,
      });
      return sessions.map((s) => this.normalizeTenantSession(s));
    });
  }

  private normalizePlatformSession(
    s: PlatformSessionEntity,
  ): INormalizedSession {
    return {
      id: s.id,
      userId: s.userId,
      appContext: AppContext.ADMIN,
      ipAddress: s.ipAddress,
      userAgent: s.userAgent,
      expiresAt: s.expiresAt,
      revokedAt: s.revokedAt,
      createdAt: s.createdAt,
    };
  }

  private normalizeTenantSession(s: SessionEntity): INormalizedSession {
    return {
      id: s.id,
      userId: s.userId,
      appContext: s.appContext,
      ipAddress: s.ipAddress,
      userAgent: s.userAgent,
      expiresAt: s.expiresAt,
      revokedAt: s.revokedAt,
      createdAt: s.createdAt,
    };
  }
}
