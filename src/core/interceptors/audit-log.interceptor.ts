import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { ClsService } from 'nestjs-cls';
import { Request } from 'express';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { IClsStore } from '../context/request-context';
import { IJwtPayload } from '../../shared/interfaces/jwt-payload.interface';
import { IAuthenticatedRequest } from '../../shared/interfaces/authenticated-request.interface';
import { DATA_SOURCE_PLATFORM } from 'src/shared/constants/data-source.constants';
import { PlatformAuditLogEntity } from 'src/database/entities/platform';
import { AppContext } from '../../shared/enums/app-context.enum';

const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/** Logs all state-changing API calls to the immutable audit trail */
@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditLogInterceptor.name);

  constructor(
    private readonly cls: ClsService<IClsStore>,
    @InjectDataSource(DATA_SOURCE_PLATFORM)
    private readonly platformDs: DataSource,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<IAuthenticatedRequest>();

    // Only audit write operations
    if (!WRITE_METHODS.has(request.method)) return next.handle();

    const startedAt = Date.now();

    return next.handle().pipe(
      tap(() => {
        void this.persistAuditLog(request, 'SUCCESS', Date.now() - startedAt);
      }),
      catchError((err) => {
        void this.persistAuditLog(
          request,
          'FAILURE',
          Date.now() - startedAt,
          err,
        );
        return throwError(() => err);
      }),
    );
  }

  private async persistAuditLog(
    request: IAuthenticatedRequest,
    outcome: 'SUCCESS' | 'FAILURE',
    durationMs: number,
    error?: Error,
  ): Promise<void> {
    try {
      const user: IJwtPayload | undefined = request.user;
      const requestId = this.cls.get('REQUEST_ID') ?? undefined;
      const tenantId = this.cls.get('TENANT_ID') ?? undefined;
      const appContext = this.cls.get('APP_CONTEXT') ?? AppContext.WEBSITE;

      const log = this.platformDs.getRepository(PlatformAuditLogEntity).create({
        actorId: user?.sub ?? null,
        tenantId: tenantId ?? null,
        appContext,
        action: `${request.method} ${request.route?.path ?? request.path}`,
        metadata: {
          outcome,
          durationMs,
          ...(error ? { error: error.message } : {}),
        },
        ipAddress: this.extractIp(request),
        userAgent: request.headers['user-agent'] ?? null,
        requestId: requestId ?? null,
      });

      await this.platformDs.getRepository(PlatformAuditLogEntity).save(log);
    } catch (auditError) {
      // Never let audit failures affect the response
      this.logger.error('Audit log write failed', auditError);
    }
  }

  private extractIp(req: Request): string {
    return (
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ??
      req.socket.remoteAddress ??
      'unknown'
    );
  }
}
