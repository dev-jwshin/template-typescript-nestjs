import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as compression from 'compression';
import { AppModule } from './app.module';
import { JsonApiExceptionFilter } from './common/filters/jsonapi-exception.filter';
import { I18nValidationPipe } from './common/pipes/i18n-validation.pipe';

/**
 * 애플리케이션 부트스트랩 함수
 * - 글로벌 파이프, 필터, 인터셉터 설정
 * - Swagger API 문서 설정
 * - CORS 및 보안 설정
 * - JSON:API 1.1 스펙 적용
 * - 다국어 검증 메시지 지원 (I18n)
 */
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // JSON:API Content-Type 지원을 위한 body parser 설정
  app.use((req: any, res: any, next: any) => {
    if (req.headers['content-type'] === 'application/vnd.api+json') {
      req.headers['content-type'] = 'application/json';
    }
    next();
  });

  // Gzip 압축 설정 (응답 크기 40-70% 감소)
  const compressionEnabled = process.env.COMPRESSION_ENABLED !== 'false'; // 기본값: true
  if (compressionEnabled) {
    const compressionLevel = parseInt(process.env.COMPRESSION_LEVEL || '6', 10);
    const compressionThreshold = parseInt(process.env.COMPRESSION_THRESHOLD || '1024', 10);

    app.use(
      compression({
        // x-no-compression 헤더가 있으면 압축 스킵
        filter: (req, res) => {
          if (req.headers['x-no-compression']) {
            return false;
          }
          return compression.filter(req, res);
        },
        // 압축 레벨 (1-9, 환경 변수로 제어)
        // 1 = 최소 압축/최고 속도, 9 = 최대 압축/최저 속도
        level: compressionLevel,
        // 최소 압축 크기 (환경 변수로 제어)
        threshold: compressionThreshold,
      }),
    );
    console.log(
      `✅ Gzip compression enabled (level: ${compressionLevel}, threshold: ${compressionThreshold} bytes)`,
    );
  } else {
    console.log('⚠️  Gzip compression is disabled');
  }

  // JSON:API 에러 필터 글로벌 적용
  app.useGlobalFilters(new JsonApiExceptionFilter());

  // 글로벌 밸리데이션 파이프 설정 (I18n 지원)
  app.useGlobalPipes(
    new I18nValidationPipe(),
    // 추가 변환 옵션을 위한 기본 ValidationPipe
    new ValidationPipe({
      whitelist: true, // DTO에 정의되지 않은 속성 제거
      transform: true, // 요청 데이터를 DTO 인스턴스로 자동 변환
      transformOptions: {
        enableImplicitConversion: true, // 타입 자동 변환
      },
    }),
  );

  // CORS 설정
  app.enableCors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
  });

  // API 버전 접두사 설정
  app.setGlobalPrefix('api');

  // Swagger 문서 설정
  const config = new DocumentBuilder()
    .setTitle('NestJS API Template (JSON:API 1.1)')
    .setDescription(
      'Claude Code 최적화 NestJS TypeScript 템플릿 API\n\n' +
        '이 API는 JSON:API 1.1 스펙을 준수합니다.\n\n' +
        '**지원 기능:**\n' +
        '- Sparse Fieldsets: `?fields[resource]=field1,field2`\n' +
        '- Filtering: `?filter[field]=value`\n' +
        '- Sorting: `?sort=-field1,field2`\n' +
        '- Pagination: `?page[number]=1&page[size]=10`\n' +
        '- Compound Documents: `?include=related`\n\n' +
        '자세한 내용: https://jsonapi.org/format/1.1/',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);

  console.log(`🚀 Application is running on: http://localhost:${port}`);
  console.log(`📚 Swagger documentation: http://localhost:${port}/api/docs`);
}

bootstrap();
