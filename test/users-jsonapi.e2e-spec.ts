/**
 * Users 모듈 JSON:API E2E 테스트
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { JsonApiExceptionFilter } from '../src/common/filters/jsonapi-exception.filter';

describe('Users API (JSON:API E2E)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // 글로벌 설정 적용
    app.useGlobalFilters(new JsonApiExceptionFilter());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        // JSON:API 형식 지원을 위해 forbidNonWhitelisted 제거
        transform: true,
      }),
    );
    app.setGlobalPrefix('api');

    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('POST /api/users (Create)', () => {
    it('should create a user with JSON:API format', () => {
      return request(app.getHttpServer())
        .post('/api/users')
        .send({
          data: {
            type: 'users',
            attributes: {
              name: 'John Doe',
              email: 'john@example.com',
              password: 'securepass123',
            },
          },
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.jsonapi).toEqual({ version: '1.1' });
          expect(res.body.data.type).toBe('users');
          expect(res.body.data.id).toBeDefined();
          expect(res.body.data.attributes.name).toBe('John Doe');
          expect(res.body.data.attributes.email).toBe('john@example.com');
          expect(res.body.data.attributes).not.toHaveProperty('password');
        });
    });

    it('should return validation error in JSON:API format', () => {
      return request(app.getHttpServer())
        .post('/api/users')
        .send({
          data: {
            type: 'users',
            attributes: {
              name: 'John',
              // email missing
              password: 'pass',
            },
          },
        })
        .expect(422)
        .expect((res) => {
          expect(res.body.jsonapi).toEqual({ version: '1.1' });
          expect(res.body.errors).toBeDefined();
          expect(Array.isArray(res.body.errors)).toBe(true);
        });
    });

    it('should reject invalid resource type', () => {
      return request(app.getHttpServer())
        .post('/api/users')
        .send({
          data: {
            type: 'posts', // wrong type
            attributes: {
              name: 'John Doe',
              email: 'john@example.com',
              password: 'pass',
            },
          },
        })
        .expect(400);
    });
  });

  describe('GET /api/users (List)', () => {
    beforeEach(async () => {
      // Create test users
      for (let i = 1; i <= 3; i++) {
        await request(app.getHttpServer())
          .post('/api/users')
          .send({
            data: {
              type: 'users',
              attributes: {
                name: `User ${i}`,
                email: `user${i}@example.com`,
                password: 'password123',
              },
            },
          });
      }
    });

    it('should return users in JSON:API format', () => {
      return request(app.getHttpServer())
        .get('/api/users')
        .expect(200)
        .expect((res) => {
          expect(res.body.jsonapi).toEqual({ version: '1.1' });
          expect(Array.isArray(res.body.data)).toBe(true);
          expect(res.body.data.length).toBeGreaterThan(0);
          expect(res.body.data[0].type).toBe('users');
          expect(res.body.data[0].id).toBeDefined();
          expect(res.body.data[0].attributes).toBeDefined();
        });
    });

    it('should support pagination', () => {
      return request(app.getHttpServer())
        .get('/api/users?page[number]=1&page[size]=2')
        .expect(200)
        .expect((res) => {
          expect(res.body.data).toHaveLength(2);
          expect(res.body.meta).toBeDefined();
          expect(res.body.meta.currentPage).toBe(1);
          expect(res.body.meta.pageSize).toBe(2);
          expect(res.body.meta.totalItems).toBeGreaterThanOrEqual(3);
          expect(res.body.links).toBeDefined();
          expect(res.body.links.self).toContain('page[number]=1');
        });
    });

    it('should support sparse fieldsets', () => {
      return request(app.getHttpServer())
        .get('/api/users?fields[users]=name,email')
        .expect(200)
        .expect((res) => {
          const firstUser = res.body.data[0];
          expect(firstUser.attributes).toHaveProperty('name');
          expect(firstUser.attributes).toHaveProperty('email');
          expect(firstUser.attributes).not.toHaveProperty('isActive');
        });
    });

    it('should support filtering', () => {
      return request(app.getHttpServer())
        .get('/api/users?filter[name]=User 1')
        .expect(200)
        .expect((res) => {
          expect(res.body.data.length).toBeGreaterThan(0);
          res.body.data.forEach((user: any) => {
            expect(user.attributes.name).toContain('User 1');
          });
        });
    });

    it('should support sorting', () => {
      return request(app.getHttpServer())
        .get('/api/users?sort=-name')
        .expect(200)
        .expect((res) => {
          const names = res.body.data.map((u: any) => u.attributes.name);
          const sortedNames = [...names].sort().reverse();
          expect(names).toEqual(sortedNames);
        });
    });

    it('should support combined query parameters', () => {
      return request(app.getHttpServer())
        .get('/api/users?fields[users]=name&filter[isActive]=true&sort=-name&page[number]=1&page[size]=10')
        .expect(200)
        .expect((res) => {
          expect(res.body.jsonapi).toBeDefined();
          expect(res.body.data).toBeDefined();
          expect(res.body.meta).toBeDefined();
          expect(res.body.links).toBeDefined();
        });
    });
  });

  describe('GET /api/users/:id (Get One)', () => {
    let userId: string;

    beforeEach(async () => {
      const response = await request(app.getHttpServer())
        .post('/api/users')
        .send({
          data: {
            type: 'users',
            attributes: {
              name: 'Test User',
              email: 'test@example.com',
              password: 'password123',
            },
          },
        });

      userId = response.body.data.id;
    });

    it('should return a single user in JSON:API format', () => {
      return request(app.getHttpServer())
        .get(`/api/users/${userId}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.jsonapi).toEqual({ version: '1.1' });
          expect(res.body.data.type).toBe('users');
          expect(res.body.data.id).toBe(userId);
          expect(res.body.data.attributes.name).toBe('Test User');
        });
    });

    it('should support sparse fieldsets for single resource', () => {
      return request(app.getHttpServer())
        .get(`/api/users/${userId}?fields[users]=name`)
        .expect(200)
        .expect((res) => {
          expect(res.body.data.attributes).toHaveProperty('name');
          expect(res.body.data.attributes).not.toHaveProperty('email');
        });
    });

    it('should return 404 error in JSON:API format', () => {
      return request(app.getHttpServer())
        .get('/api/users/nonexistent')
        .expect(404)
        .expect((res) => {
          expect(res.body.jsonapi).toEqual({ version: '1.1' });
          expect(res.body.errors).toBeDefined();
          expect(res.body.errors[0].status).toBe('404');
          expect(res.body.errors[0].code).toBe('NOT_FOUND');
        });
    });
  });

  describe('PATCH /api/users/:id (Update)', () => {
    let userId: string;

    beforeEach(async () => {
      const response = await request(app.getHttpServer())
        .post('/api/users')
        .send({
          data: {
            type: 'users',
            attributes: {
              name: 'Original Name',
              email: 'original@example.com',
              password: 'password123',
            },
          },
        });

      userId = response.body.data.id;
    });

    it('should update a user with JSON:API format', () => {
      return request(app.getHttpServer())
        .patch(`/api/users/${userId}`)
        .send({
          data: {
            type: 'users',
            id: userId,
            attributes: {
              name: 'Updated Name',
            },
          },
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.data.attributes.name).toBe('Updated Name');
          expect(res.body.data.attributes.email).toBe('original@example.com');
        });
    });
  });

  describe('DELETE /api/users/:id (Delete)', () => {
    let userId: string;

    beforeEach(async () => {
      const response = await request(app.getHttpServer())
        .post('/api/users')
        .send({
          data: {
            type: 'users',
            attributes: {
              name: 'To Delete',
              email: 'delete@example.com',
              password: 'password123',
            },
          },
        });

      userId = response.body.data.id;
    });

    it('should delete a user and return 204', () => {
      return request(app.getHttpServer())
        .delete(`/api/users/${userId}`)
        .expect(204);
    });

    it('should return 404 when deleting non-existent user', () => {
      return request(app.getHttpServer())
        .delete('/api/users/nonexistent')
        .expect(404)
        .expect((res) => {
          expect(res.body.errors).toBeDefined();
          expect(res.body.errors[0].status).toBe('404');
        });
    });
  });
});
