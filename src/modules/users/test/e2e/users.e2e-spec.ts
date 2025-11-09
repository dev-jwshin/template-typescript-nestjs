import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { UsersModule } from '../../users.module';
import { PrismaService } from '../../../../database/prisma.service';

describe('UsersController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [UsersModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = app.get(PrismaService);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  /**
   * TODO: E2E 테스트 케이스 추가
   *
   * @example
   * describe('GET /users', () => {
   *   it('user 목록을 반환해야 함', () => {
   *     return request(app.getHttpServer())
   *       .get('/users')
   *       .expect(200)
   *       .expect((res) => {
   *         expect(res.body.data).toBeInstanceOf(Array);
   *       });
   *   });
   * });
   */
});
