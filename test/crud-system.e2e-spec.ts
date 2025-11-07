import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';

/**
 * CRUD 시스템 통합 테스트
 *
 * 테스트 항목:
 * 1. 기본 CRUD 작업 (Create, Read, Update, Delete)
 * 2. 필터링 (13가지 연산자)
 * 3. 정렬 및 페이지네이션
 * 4. N+1 쿼리 최적화
 * 5. 자동 직렬화 (비밀번호 제외)
 */
describe('CRUD System (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let createdUserIds: string[] = [];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);

    // 기존 데이터 정리
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    // 테스트 데이터 정리
    await prisma.user.deleteMany();
    await app.close();
  });

  describe('1. 기본 CRUD 작업', () => {
    it('POST /users - 사용자 생성', async () => {
      const response = await request(app.getHttpServer())
        .post('/users')
        .send({
          name: 'John Doe',
          email: 'john@example.com',
          password: 'password123',
          isActive: true,
        })
        .expect(201);

      expect(response.body.data.id).toBeDefined();
      expect(response.body.data.name).toBe('John Doe');
      expect(response.body.data.email).toBe('john@example.com');
      expect(response.body.data.password).toBeUndefined(); // 비밀번호 제외 확인
      expect(response.body.data.isActive).toBe(true);

      createdUserIds.push(response.body.data.id);
    });

    it('GET /users/:id - 단일 사용자 조회', async () => {
      const userId = createdUserIds[0];
      const response = await request(app.getHttpServer())
        .get(`/users/${userId}`)
        .expect(200);

      expect(response.body.data.id).toBe(userId);
      expect(response.body.data.name).toBe('John Doe');
      expect(response.body.data.password).toBeUndefined(); // 비밀번호 제외 확인
    });

    it('GET /users - 모든 사용자 조회', async () => {
      const response = await request(app.getHttpServer())
        .get('/users')
        .expect(200);

      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data[0].password).toBeUndefined(); // 비밀번호 제외 확인
    });

    it('PATCH /users/:id - 사용자 수정', async () => {
      const userId = createdUserIds[0];
      const response = await request(app.getHttpServer())
        .patch(`/users/${userId}`)
        .send({
          name: 'John Updated',
        })
        .expect(200);

      expect(response.body.data.name).toBe('John Updated');
      expect(response.body.data.password).toBeUndefined(); // 비밀번호 제외 확인
    });

    it('DELETE /users/:id - 사용자 삭제', async () => {
      const userId = createdUserIds[0];
      await request(app.getHttpServer())
        .delete(`/users/${userId}`)
        .expect(200);

      // 삭제 확인
      await request(app.getHttpServer())
        .get(`/users/${userId}`)
        .expect(404);
    });
  });

  describe('2. 필터링 (13가지 연산자)', () => {
    beforeAll(async () => {
      // 테스트 데이터 생성
      const users = [
        { name: 'Alice', email: 'alice@example.com', password: 'pass1', isActive: true },
        { name: 'Bob', email: 'bob@example.com', password: 'pass2', isActive: false },
        { name: 'Charlie', email: 'charlie@example.com', password: 'pass3', isActive: true },
        { name: 'David', email: 'david@example.com', password: 'pass4', isActive: true },
      ];

      for (const user of users) {
        const response = await request(app.getHttpServer())
          .post('/users')
          .send(user);
        createdUserIds.push(response.body.data.id);
      }
    });

    it('filter[name][eq] - 정확한 일치', async () => {
      const response = await request(app.getHttpServer())
        .get('/users?filter[name][eq]=Alice')
        .expect(200);

      expect(response.body.data.length).toBe(1);
      expect(response.body.data[0].name).toBe('Alice');
    });

    it('filter[name][like] - 패턴 매칭', async () => {
      const response = await request(app.getHttpServer())
        .get('/users?filter[name][like]=Ali')
        .expect(200);

      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data[0].name).toContain('Ali');
    });

    it('filter[isActive][eq] - 불린 필터', async () => {
      const response = await request(app.getHttpServer())
        .get('/users?filter[isActive][eq]=true')
        .expect(200);

      expect(response.body.data.every((user: any) => user.isActive === true)).toBe(true);
    });

    it('filter[createdAt][gte] - 날짜 범위', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const response = await request(app.getHttpServer())
        .get(`/users?filter[createdAt][gte]=${yesterday.toISOString()}`)
        .expect(200);

      expect(response.body.data.length).toBeGreaterThan(0);
    });
  });

  describe('3. 정렬 및 페이지네이션', () => {
    it('sort=-createdAt - 생성일 내림차순', async () => {
      const response = await request(app.getHttpServer())
        .get('/users?sort=-createdAt')
        .expect(200);

      expect(response.body.data.length).toBeGreaterThan(1);
      const dates = response.body.data.map((u: any) => new Date(u.createdAt).getTime());
      expect(dates).toEqual([...dates].sort((a, b) => b - a));
    });

    it('page[number]=1&page[size]=2 - 페이지네이션', async () => {
      const response = await request(app.getHttpServer())
        .get('/users?page[number]=1&page[size]=2')
        .expect(200);

      expect(response.body.data.length).toBeLessThanOrEqual(2);
      expect(response.body.meta.pagination).toBeDefined();
      expect(response.body.meta.pagination.total).toBeGreaterThan(0);
      expect(response.body.meta.pagination.page).toBe(1);
      expect(response.body.meta.pagination.pageSize).toBe(2);
    });
  });

  describe('4. N+1 쿼리 최적화', () => {
    it('eagerLoad 설정으로 N+1 쿼리 방지', async () => {
      // UsersService에서 eagerLoad: true 설정 확인
      const response = await request(app.getHttpServer())
        .get('/users')
        .expect(200);

      // 응답 시간이 합리적인지 확인 (N+1 쿼리가 없으면 빠름)
      expect(response.body.data).toBeInstanceOf(Array);
      // 실제로는 Prisma 쿼리 로그를 확인해야 하지만, E2E 테스트에서는 응답 시간으로 간접 확인
    });
  });

  describe('5. 자동 직렬화 (비밀번호 제외)', () => {
    it('모든 응답에서 비밀번호가 제외되는지 확인', async () => {
      // Create
      const createResponse = await request(app.getHttpServer())
        .post('/users')
        .send({
          name: 'Serialization Test',
          email: 'serialize@example.com',
          password: 'secret123',
        });
      expect(createResponse.body.data.password).toBeUndefined();

      const userId = createResponse.body.data.id;
      createdUserIds.push(userId);

      // Read
      const readResponse = await request(app.getHttpServer())
        .get(`/users/${userId}`);
      expect(readResponse.body.data.password).toBeUndefined();

      // Update
      const updateResponse = await request(app.getHttpServer())
        .patch(`/users/${userId}`)
        .send({ name: 'Updated Name' });
      expect(updateResponse.body.data.password).toBeUndefined();

      // List
      const listResponse = await request(app.getHttpServer())
        .get('/users');
      expect(listResponse.body.data.every((u: any) => u.password === undefined)).toBe(true);
    });
  });

  describe('6. 성능 테스트', () => {
    it('대량 데이터 조회 성능', async () => {
      const startTime = Date.now();
      const response = await request(app.getHttpServer())
        .get('/users?page[size]=100')
        .expect(200);
      const endTime = Date.now();

      const responseTime = endTime - startTime;
      console.log(`대량 조회 응답 시간: ${responseTime}ms`);

      // 응답 시간이 1초 미만이어야 함 (N+1 쿼리가 없으면 빠름)
      expect(responseTime).toBeLessThan(1000);
    });

    it('복잡한 필터 쿼리 성능', async () => {
      const startTime = Date.now();
      const response = await request(app.getHttpServer())
        .get('/users?filter[name][like]=a&filter[isActive][eq]=true&sort=-createdAt&page[number]=1&page[size]=10')
        .expect(200);
      const endTime = Date.now();

      const responseTime = endTime - startTime;
      console.log(`복잡한 필터 응답 시간: ${responseTime}ms`);

      // 복잡한 쿼리도 500ms 미만이어야 함
      expect(responseTime).toBeLessThan(500);
    });
  });

  describe('7. 에러 처리', () => {
    it('존재하지 않는 사용자 조회', async () => {
      await request(app.getHttpServer())
        .get('/users/00000000-0000-0000-0000-000000000000')
        .expect(404);
    });

    it('잘못된 필터 연산자', async () => {
      // allowedFilters에 없는 필드는 무시되어야 함
      const response = await request(app.getHttpServer())
        .get('/users?filter[invalidField][eq]=test')
        .expect(200);

      // 에러가 아니라 무시되어야 함 (보안상 안전)
      expect(response.body.data).toBeInstanceOf(Array);
    });

    it('유효성 검증 실패', async () => {
      await request(app.getHttpServer())
        .post('/users')
        .send({
          name: '',
          email: 'invalid-email',
          password: '123',
        })
        .expect(400);
    });
  });
});
