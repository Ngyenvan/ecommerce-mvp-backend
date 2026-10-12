import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import type { Observable } from 'rxjs';
import { tap } from 'rxjs';

@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(RequestLoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();

    const providedRequestId = request.headers['x-request-id'];

    const requestId =
      typeof providedRequestId === 'string' && providedRequestId.length > 0
        ? providedRequestId
        : randomUUID();

    response.setHeader('X-Request-Id', requestId);

    const startedAt = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          this.logRequest(request, response.statusCode, requestId, startedAt);
        },
        error: (error: unknown) => {
          const statusCode =
            typeof error === 'object' &&
            error !== null &&
            'status' in error &&
            typeof error.status === 'number'
              ? error.status
              : 500;

          this.logRequest(request, statusCode, requestId, startedAt);
        },
      }),
    );
  }

  private logRequest(
    request: Request,
    statusCode: number,
    requestId: string,
    startedAt: number,
  ): void {
    this.logger.log(
      JSON.stringify({
        requestId,
        method: request.method,
        path: request.originalUrl,
        statusCode,
        durationMs: Date.now() - startedAt,
      }),
    );
  }
}
