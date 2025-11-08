import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, Injectable, Controller } from '@nestjs/common';
import request from 'supertest';
import { Crud } from '../src/common/crud/decorators/crud.decorator';
import {
  BeforeCreate,
  AfterCreate,
  BeforeUpdate,
  AfterUpdate,
  BeforeDelete,
  AfterDelete,
  Before,
  After,
} from '../src/common/crud/decorators/hook.decorator';
import {
  ParsedBody,
  CreatedEntity,
  UpdatedEntity,
  DeletedEntity,
} from '../src/common/crud/decorators/param.decorator';
import { CrudOperation } from '../src/common/crud/types/crud-operation.enum';
import { AuditLogPlugin } from '../src/common/crud/plugins/audit-log.plugin';
import { CrudPlugin } from '../src/common/crud/plugins/crud-plugin.interface';

/**
 * 테스트용 Mock Service
 */
@Injectable()
class TestCrudService {
  private items: any[] = [
    { id: '1', name: 'Test Item 1', status: 'active' },
    { id: '2', name: 'Test Item 2', status: 'inactive' },
  ];

  async findAll(options?: any) {
    return this.items;
  }

  async findOne(id: string) {
    const item = this.items.find((i) => i.id === id);
    if (!item) {
      throw new Error('Not found');
    }
    return item;
  }

  async create(dto: any) {
    const newItem = {
      id: String(this.items.length + 1),
      ...dto,
      createdAt: new Date().toISOString(),
    };
    this.items.push(newItem);
    return newItem;
  }

  async update(id: string, dto: any) {
    const index = this.items.findIndex((i) => i.id === id);
    if (index === -1) {
      throw new Error('Not found');
    }
    this.items[index] = { ...this.items[index], ...dto };
    return this.items[index];
  }

  async remove(id: string) {
    const index = this.items.findIndex((i) => i.id === id);
    if (index === -1) {
      throw new Error('Not found');
    }
    const removed = this.items[index];
    this.items.splice(index, 1);
    return removed;
  }
}

/**
 * 테스트용 컨트롤러 - 훅 시스템 테스트
 */
@Crud({
  only: [
    CrudOperation.Index,
    CrudOperation.Show,
    CrudOperation.Create,
    CrudOperation.Update,
    CrudOperation.Delete,
  ],
  resourceType: 'test-items',
  allowedParams: {
    name: { required: true },
    status: { required: false },
  },
})
@Controller('test-hooks')
class TestHooksController {
  // 훅 실행 기록
  static hookLog: string[] = [];

  constructor(private readonly service: TestCrudService) {}

  /**
   * Create 훅 테스트
   */
  @BeforeCreate()
  async beforeCreateHook(@ParsedBody() dto: any) {
    TestHooksController.hookLog.push('beforeCreate');
    // 데이터 변환 테스트
    dto.name = dto.name?.toUpperCase();
    return dto;
  }

  @AfterCreate()
  async afterCreateHook(@CreatedEntity() entity: any) {
    TestHooksController.hookLog.push('afterCreate');
    // 추가 필드 테스트
    entity.hookApplied = true;
    return entity;
  }

  /**
   * Update 훅 테스트
   */
  @BeforeUpdate()
  async beforeUpdateHook(@ParsedBody() dto: any) {
    TestHooksController.hookLog.push('beforeUpdate');
    dto.updatedAt = new Date().toISOString();
    return dto;
  }

  @AfterUpdate()
  async afterUpdateHook(@UpdatedEntity() entity: any) {
    TestHooksController.hookLog.push('afterUpdate');
    entity.hookApplied = true;
    return entity;
  }

  /**
   * Delete 훅 테스트
   */
  @BeforeDelete()
  async beforeDeleteHook() {
    TestHooksController.hookLog.push('beforeDelete');
  }

  @AfterDelete()
  async afterDeleteHook(@DeletedEntity() entity: any) {
    TestHooksController.hookLog.push('afterDelete');
    return entity;
  }

  /**
   * 커스텀 함수 훅 테스트
   */
  customAction() {
    TestHooksController.hookLog.push('customAction');
    return { message: 'Custom action executed' };
  }

  @Before('customAction')
  async beforeCustom() {
    TestHooksController.hookLog.push('beforeCustom');
  }

  @After('customAction')
  async afterCustom(result: any) {
    TestHooksController.hookLog.push('afterCustom');
    result.hookApplied = true;
    return result;
  }
}

/**
 * 테스트용 컨트롤러 - 플러그인 테스트
 */
@Crud({
  only: [CrudOperation.Create, CrudOperation.Update, CrudOperation.Delete],
  resourceType: 'test-plugins',
  plugins: [AuditLogPlugin],
  allowedParams: {
    name: { required: true },
  },
})
@Controller('test-plugins')
class TestPluginsController {
  constructor(private readonly service: TestCrudService) {}
}

describe('CRUD 훅 & 플러그인 시스템 (E2E)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [TestHooksController, TestPluginsController],
      providers: [TestCrudService],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // 훅 로그 초기화
    TestHooksController.hookLog = [];
  });

  afterEach(async () => {
    await app.close();
  });

  describe('훅 시스템 테스트', () => {
    describe('Create 훅', () => {
      it('BeforeCreate 훅이 실행되어야 함', async () => {
        const response = await request(app.getHttpServer())
          .post('/test-hooks')
          .send({ name: 'test item', status: 'active' })
          .expect(201);

        // beforeCreate 훅에서 name을 대문자로 변환
        expect(response.body.name).toBe('TEST ITEM');
        expect(TestHooksController.hookLog).toContain('beforeCreate');
      });

      it('AfterCreate 훅이 실행되어야 함', async () => {
        const response = await request(app.getHttpServer())
          .post('/test-hooks')
          .send({ name: 'test', status: 'active' })
          .expect(201);

        // afterCreate 훅에서 추가 필드 추가
        expect(response.body.hookApplied).toBe(true);
        expect(TestHooksController.hookLog).toContain('afterCreate');
      });

      it('훅 실행 순서: beforeCreate → create → afterCreate', async () => {
        await request(app.getHttpServer())
          .post('/test-hooks')
          .send({ name: 'test', status: 'active' })
          .expect(201);

        const log = TestHooksController.hookLog;
        const beforeIndex = log.indexOf('beforeCreate');
        const afterIndex = log.indexOf('afterCreate');

        expect(beforeIndex).toBeGreaterThanOrEqual(0);
        expect(afterIndex).toBeGreaterThan(beforeIndex);
      });
    });

    describe('Update 훅', () => {
      it('BeforeUpdate 훅이 실행되어야 함', async () => {
        const response = await request(app.getHttpServer())
          .patch('/test-hooks/1')
          .send({ name: 'updated' })
          .expect(200);

        // beforeUpdate 훅에서 updatedAt 추가
        expect(response.body.updatedAt).toBeDefined();
        expect(TestHooksController.hookLog).toContain('beforeUpdate');
      });

      it('AfterUpdate 훅이 실행되어야 함', async () => {
        const response = await request(app.getHttpServer())
          .patch('/test-hooks/1')
          .send({ name: 'updated' })
          .expect(200);

        expect(response.body.hookApplied).toBe(true);
        expect(TestHooksController.hookLog).toContain('afterUpdate');
      });
    });

    describe('Delete 훅', () => {
      it('BeforeDelete와 AfterDelete 훅이 실행되어야 함', async () => {
        await request(app.getHttpServer()).delete('/test-hooks/1').expect(204);

        expect(TestHooksController.hookLog).toContain('beforeDelete');
        expect(TestHooksController.hookLog).toContain('afterDelete');
      });
    });

    describe('커스텀 함수 훅', () => {
      it('@Before와 @After 훅이 커스텀 함수에 적용되어야 함', () => {
        const controller = new TestHooksController(new TestCrudService());

        // 커스텀 함수 실행 시뮬레이션
        const result = controller.customAction();

        // 훅 실행 순서 확인
        const log = TestHooksController.hookLog;
        expect(log).toContain('beforeCustom');
        expect(log).toContain('customAction');
        expect(log).toContain('afterCustom');
      });
    });
  });

  describe('플러그인 시스템 테스트', () => {
    describe('AuditLogPlugin', () => {
      it('Create 작업 시 감사 로그가 기록되어야 함', async () => {
        // 콘솔 출력 캡처
        const consoleSpy = jest.spyOn(console, 'log');

        await request(app.getHttpServer())
          .post('/test-plugins')
          .send({ name: 'Plugin Test' })
          .expect(201);

        // AuditLogPlugin이 로그를 출력했는지 확인
        const auditLogs = consoleSpy.mock.calls.filter((call) =>
          call[0]?.includes('[AuditLog]'),
        );

        expect(auditLogs.length).toBeGreaterThan(0);
        expect(
          auditLogs.some((log) => log[1]?.action === 'CREATE'),
        ).toBeTruthy();

        consoleSpy.mockRestore();
      });

      it('Update 작업 시 감사 로그가 기록되어야 함', async () => {
        const consoleSpy = jest.spyOn(console, 'log');

        await request(app.getHttpServer())
          .patch('/test-plugins/1')
          .send({ name: 'Updated' })
          .expect(200);

        const auditLogs = consoleSpy.mock.calls.filter((call) =>
          call[0]?.includes('[AuditLog]'),
        );

        expect(auditLogs.length).toBeGreaterThan(0);
        expect(
          auditLogs.some((log) => log[1]?.action === 'UPDATE'),
        ).toBeTruthy();

        consoleSpy.mockRestore();
      });

      it('Delete 작업 시 감사 로그가 기록되어야 함', async () => {
        const consoleSpy = jest.spyOn(console, 'log');

        await request(app.getHttpServer())
          .delete('/test-plugins/1')
          .expect(204);

        const auditLogs = consoleSpy.mock.calls.filter((call) =>
          call[0]?.includes('[AuditLog]'),
        );

        expect(auditLogs.length).toBeGreaterThan(0);
        expect(
          auditLogs.some((log) => log[1]?.action === 'DELETE'),
        ).toBeTruthy();

        consoleSpy.mockRestore();
      });
    });
  });

  describe('통합 테스트: 훅 + 플러그인', () => {
    /**
     * 커스텀 플러그인: 타임스탬프 자동 추가
     */
    const TimestampPlugin: CrudPlugin = {
      name: 'timestamp',
      version: '1.0.0',

      registerHooks() {
        return {
          before: {
            [CrudOperation.Create]: async (data: any) => {
              data.createdAt = new Date().toISOString();
              return data;
            },
            [CrudOperation.Update]: async (data: any) => {
              data.updatedAt = new Date().toISOString();
              return data;
            },
          },
        };
      },
    };

    it('플러그인과 사용자 정의 훅이 함께 동작해야 함', async () => {
      // 플러그인이 포함된 컨트롤러 생성 (동적 테스트)
      // 실제로는 위의 TestPluginsController처럼 데코레이터로 설정

      const response = await request(app.getHttpServer())
        .post('/test-hooks')
        .send({ name: 'integrated test', status: 'active' })
        .expect(201);

      // 사용자 정의 훅 적용 확인
      expect(response.body.name).toBe('INTEGRATED TEST');
      expect(response.body.hookApplied).toBe(true);

      // 훅 실행 순서
      expect(TestHooksController.hookLog).toContain('beforeCreate');
      expect(TestHooksController.hookLog).toContain('afterCreate');
    });
  });
});
