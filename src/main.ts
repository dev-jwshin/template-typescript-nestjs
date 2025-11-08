import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { JsonApiExceptionFilter } from './common/filters/jsonapi-exception.filter';

/**
 * 애플리케이션 부트스트랩 함수
 * - 글로벌 파이프, 필터, 인터셉터 설정
 * - Swagger API 문서 설정
 * - CORS 및 보안 설정
 * - JSON:API 1.1 스펙 적용
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

  // JSON:API 에러 필터 글로벌 적용
  app.useGlobalFilters(new JsonApiExceptionFilter());

  // 글로벌 밸리데이션 파이프 설정
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // DTO에 정의되지 않은 속성 제거
      // JSON:API 형식 지원을 위해 forbidNonWhitelisted 제거
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
