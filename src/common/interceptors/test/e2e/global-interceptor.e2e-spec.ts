import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../../../app.module';
import { JsonApiExceptionFilter } from '../../../filters/jsonapi-exception.filter';
import { PrismaService } from '../../../../database/prisma.service';

/**
 * 글로벌 인터셉터 E2E 테스트
 *
 * JsonApiTransformInterceptor가 APP_INTERCEPTOR로 글로벌 등록되어
 * 모든 컨트롤러에 자동으로 적용되는지 테스트합니다.
 *
 * 테스트 케이스:
 * 1. JSON:API 형식으로 응답이 변환되는지 확인
 * 2. 리소스 타입이 없는 엔드포인트는 영향받지 않는지 확인
 * 3. 에러 응답도 JSON:API 형식으로 변환되는지 확인
 */
describe('Global JsonApiTransformInterceptor (E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = app.get<PrismaService>(PrismaService);

    // 글로벌 파이프 설정 (main.ts와 동일)
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    );

    // 글로벌 필터 설정 (main.ts와 동일)
    app.useGlobalFilters(new JsonApiExceptionFilter());

    // API 버전 접두사 설정
    app.setGlobalPrefix('api');

    await app.init();

    // 데이터베이스 초기화
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  afterEach(async () => {
    // 각 테스트 후 데이터 정리
    await prisma.user.deleteMany();
  });

  describe('JSON:API 자동 변환 테스트', () => {
    it('GET /api/users - 빈 배열도 JSON:API 형식으로 변환되어야 함', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/users')
        .expect(200);

      // JSON:API 필수 필드 검증
      expect(response.body).toHaveProperty('jsonapi');
      expect(response.body.jsonapi).toEqual({ version: '1.1' });
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data).toHaveLength(0);
    });

    it('POST /api/users - 생성된 리소스가 JSON:API 형식으로 반환되어야 함', async () => {
      const newUser = {
        data: {
          type: 'users',
          attributes: {
            name: 'Test User',
            email: 'test@example.com',
            password: 'password123',
          },
        },
      };

      const response = await request(app.getHttpServer())
        .post('/api/users')
        .send(newUser)
        .set('Content-Type', 'application/vnd.api+json')
        .expect(201);

      // JSON:API 구조 검증
      expect(response.body).toHaveProperty('jsonapi');
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('type', 'users');
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('attributes');
      expect(response.body.data.attributes).toHaveProperty('name', 'Test User');
      expect(response.body.data.attributes).toHaveProperty('email', 'test@example.com');
      // 비밀번호는 제외되어야 함 (serialize.exclude 설정)
      expect(response.body.data.attributes).not.toHaveProperty('password');
    });

    it('GET /api/users/:id - 단일 리소스가 JSON:API 형식으로 반환되어야 함', async () => {
      // 테스트 데이터 생성
      const user = await prisma.user.create({
        data: {
          name: 'Test User',
          email: 'test@example.com',
          password: 'password123',
        },
      });

      const response = await request(app.getHttpServer())
        .get(`/api/users/${user.id}`)
        .expect(200);

      // JSON:API 구조 검증
      expect(response.body).toHaveProperty('jsonapi');
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('type', 'users');
      expect(response.body.data).toHaveProperty('id', user.id.toString());
      expect(response.body.data).toHaveProperty('attributes');
      expect(response.body.data.attributes).toHaveProperty('name', 'Test User');
    });

    it('PATCH /api/users/:id - 수정된 리소스가 JSON:API 형식으로 반환되어야 함', async () => {
      // 테스트 데이터 생성
      const user = await prisma.user.create({
        data: {
          name: 'Original Name',
          email: 'original@example.com',
          password: 'password123',
        },
      });

      const updateData = {
        data: {
          type: 'users',
          id: user.id.toString(),
          attributes: {
            name: 'Updated Name',
          },
        },
      };

      const response = await request(app.getHttpServer())
        .patch(`/api/users/${user.id}`)
        .send(updateData)
        .set('Content-Type', 'application/vnd.api+json')
        .expect(200);

      // JSON:API 구조 검증
      expect(response.body).toHaveProperty('jsonapi');
      expect(response.body).toHaveProperty('data');
      expect(response.body.data.attributes).toHaveProperty('name', 'Updated Name');
    });

    it('DELETE /api/users/:id - 삭제 성공 시 204 반환되어야 함', async () => {
      // 테스트 데이터 생성
      const user = await prisma.user.create({
        data: {
          name: 'To Be Deleted',
          email: 'delete@example.com',
          password: 'password123',
        },
      });

      await request(app.getHttpServer())
        .delete(`/api/users/${user.id}`)
        .expect(204);

      // 실제로 삭제되었는지 확인
      const deletedUser = await prisma.user.findUnique({
        where: { id: user.id },
      });
      expect(deletedUser).toBeNull();
    });
  });

  describe('일반 엔드포인트 테스트 (JSON:API 미적용)', () => {
    it('GET /api - JSON:API 형식이 아닌 일반 응답이어야 함', async () => {
      const response = await request(app.getHttpServer())
        .get('/api')
        .expect(200);

      // JSON:API 형식이 아니어야 함
      expect(response.body).not.toHaveProperty('jsonapi');
      expect(response.body).toHaveProperty('message');
    });

    it('GET /api/health - JSON:API 형식이 아닌 일반 응답이어야 함', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/health')
        .expect(200);

      // JSON:API 형식이 아니어야 함
      expect(response.body).not.toHaveProperty('jsonapi');
      expect(response.body).toHaveProperty('status', 'ok');
    });
  });

  describe('에러 응답 테스트', () => {
    it('GET /api/users/:id - 존재하지 않는 리소스는 404 에러를 JSON:API 형식으로 반환해야 함', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/users/999999')
        .expect(404);

      // JSON:API 에러 형식 검증
      expect(response.body).toHaveProperty('jsonapi');
      expect(response.body).toHaveProperty('errors');
      expect(Array.isArray(response.body.errors)).toBe(true);
      expect(response.body.errors[0]).toHaveProperty('status', '404');
      expect(response.body.errors[0]).toHaveProperty('title');
      expect(response.body.errors[0]).toHaveProperty('detail');
    });

    it('POST /api/users - 유효성 검증 실패 시 422 에러를 JSON:API 형식으로 반환해야 함', async () => {
      const invalidData = {
        data: {
          type: 'users',
          attributes: {
            // name과 email 누락 (필수 필드)
          },
        },
      };

      const response = await request(app.getHttpServer())
        .post('/api/users')
        .send(invalidData)
        .set('Content-Type', 'application/vnd.api+json')
        .expect(422);

      // JSON:API 에러 형식 검증
      expect(response.body).toHaveProperty('jsonapi');
      expect(response.body).toHaveProperty('errors');
      expect(Array.isArray(response.body.errors)).toBe(true);
      expect(response.body.errors[0]).toHaveProperty('status', '422');
    });
  });

  describe('수동 데코레이터 없이 작동 확인', () => {
    it('컨트롤러에 @UseInterceptors 없이도 JSON:API 변환이 작동해야 함', async () => {
      // users-jsonapi.controller.ts에는 더 이상 @UseInterceptors가 없음
      // APP_INTERCEPTOR로 자동 적용됨을 확인

      const response = await request(app.getHttpServer())
        .get('/api/users')
        .expect(200);

      // JSON:API 형식 확인
      expect(response.body).toHaveProperty('jsonapi');
      expect(response.body).toHaveProperty('data');
    });

    it('컨트롤러에 @UseFilters 없이도 에러가 JSON:API 형식으로 변환되어야 함', async () => {
      // users-jsonapi.controller.ts에는 더 이상 @UseFilters가 없음
      // useGlobalFilters로 자동 적용됨을 확인

      const response = await request(app.getHttpServer())
        .get('/api/users/999999')
        .expect(404);

      // JSON:API 에러 형식 확인
      expect(response.body).toHaveProperty('jsonapi');
      expect(response.body).toHaveProperty('errors');
    });
  });
});
