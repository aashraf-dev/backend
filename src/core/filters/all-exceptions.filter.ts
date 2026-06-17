import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { QueryFailedError } from 'typeorm';

interface IErrorResponse {
  success: false;
  error: {
    code: string;
    message: string | string[];
    statusCode: number;
  };
  meta: {
    requestId: string;
    timestamp: string;
    path: string;
  };
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    const { statusCode, message, code } = this.normalise(exception);

    // Log server errors with full stack; client errors at warn level
    if (statusCode >= 500) {
      this.logger.error(
        `[${req.method}] ${req.path} → ${statusCode}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    } else {
      this.logger.warn(
        `[${req.method}] ${req.path} → ${statusCode}: ${message}`,
      );
    }

    const body: IErrorResponse = {
      success: false,
      error: { code, message, statusCode },
      meta: {
        requestId: (req as any)._cls?.get?.('REQUEST_ID') ?? 'unknown',
        timestamp: new Date().toISOString(),
        path: req.path,
      },
    };

    res.status(statusCode).json(body);
  }

  private normalise(exception: unknown): {
    statusCode: number;
    message: string | string[];
    code: string;
  } {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const response = exception.getResponse();
      const message =
        typeof response === 'object' && 'message' in response
          ? (response as any).message
          : exception.message;
      return {
        statusCode: status,
        message,
        code: HttpStatus[status] ?? 'HTTP_EXCEPTION',
      };
    }

    if (exception instanceof QueryFailedError) {
      // Mask DB internals from clients
      return {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'A database error occurred',
        code: 'DATABASE_ERROR',
      };
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'An unexpected error occurred',
      code: 'INTERNAL_SERVER_ERROR',
    };
  }
}
