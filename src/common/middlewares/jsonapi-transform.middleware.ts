/**
 * JSON:API 요청 변환 미들웨어
 *
 * ValidationPipe 이전에 실행되어 JSON:API 형식을 플레인 객체로 변환합니다.
 *
 * Before: { data: { type: 'users', attributes: { name: 'John' } } }
 * After:  { name: 'John' }
 */

import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class JsonApiTransformMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // POST, PATCH, PUT 요청만 처리
    if (['POST', 'PATCH', 'PUT'].includes(req.method) && req.body) {
      // JSON:API 형식인 경우 attributes 추출
      if (req.body.data && req.body.data.attributes) {
        // 원본 JSON:API 데이터를 별도 속성에 저장 (필요시 사용)
        (req as any).jsonApiOriginal = req.body;

        // body를 attributes로 교체
        req.body = req.body.data.attributes;
      }
    }

    next();
  }
}
