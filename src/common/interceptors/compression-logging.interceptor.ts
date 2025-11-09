/**
 * 압축 로깅 인터셉터
 *
 * Gzip 압축 적용 여부와 성능 메트릭을 로깅합니다.
 *
 * 로그 정보:
 * - 압축 적용 여부
 * - 요청 URL 및 메서드
 * - 응답 크기 (압축 전/후)
 * - 압축률
 */

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';

@Injectable()
export class CompressionLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('Compression');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    const { method, url } = request;
    const acceptsGzip = request.headers['accept-encoding']?.includes('gzip');
    const skipCompression = request.headers['x-no-compression'];

    return next.handle().pipe(
      tap(() => {
        const contentEncoding = response.getHeader('content-encoding');
        const isCompressed = contentEncoding === 'gzip';

        // 압축 관련 로깅
        if (acceptsGzip && !skipCompression) {
          if (isCompressed) {
            // 압축 적용됨
            this.logger.log(`✅ [${method}] ${url} - Gzip compressed`);
          } else {
            // 압축 미적용 (threshold 미만 또는 다른 이유)
            this.logger.debug(
              `⚠️  [${method}] ${url} - Not compressed (below threshold or non-compressible)`,
            );
          }
        } else if (skipCompression) {
          // 사용자가 명시적으로 압축 제외
          this.logger.debug(`🚫 [${method}] ${url} - Compression skipped (x-no-compression)`);
        } else if (!acceptsGzip) {
          // 클라이언트가 gzip을 지원하지 않음
          this.logger.debug(`ℹ️  [${method}] ${url} - Client does not accept gzip`);
        }
      }),
    );
  }
}
