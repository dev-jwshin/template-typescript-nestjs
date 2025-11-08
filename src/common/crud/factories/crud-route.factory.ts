import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  Type,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CrudOperation } from '../types/crud-operation.enum';
import { CrudConfig } from '../types/crud-config.interface';
import { CrudHookMetadataStorage } from '../metadata/crud-hook-metadata.storage';
import { CrudHookType } from '../types/crud-hook.interface';
import { JsonApiResource } from '../../decorators/jsonapi-resource.decorator';

/**
 * CRUD 라우트 팩토리
 *
 * @Crud 데코레이터 설정을 기반으로 동적으로 라우트를 생성합니다.
 *
 * 핵심 기능:
 * - HTTP 메서드 매핑 (GET, POST, PATCH, DELETE)
 * - JSON:API 응답 변환
 * - Swagger 문서 자동 생성
 * - 파라미터 검증
 * - 필터/정렬/페이지네이션 처리
 */
export class CrudRouteFactory {
  /**
   * CRUD 작업별 라우트 생성 메서드 매핑
   */
  private static routeGenerators: Record<
    CrudOperation,
    (target: any, config: CrudConfig) => void
  > = {
    [CrudOperation.Index]: CrudRouteFactory.createIndexRoute,
    [CrudOperation.Show]: CrudRouteFactory.createShowRoute,
    [CrudOperation.Create]: CrudRouteFactory.createCreateRoute,
    [CrudOperation.Update]: CrudRouteFactory.createUpdateRoute,
    [CrudOperation.Delete]: CrudRouteFactory.createDeleteRoute,
  };

  /**
   * 메인 진입점: 모든 CRUD 라우트 생성
   *
   * @param target Controller 클래스
   * @param config CRUD 설정
   */
  static generateRoutes(target: any, config: CrudConfig): void {
    // 1. 플러그인 초기화
    if (config.plugins && config.plugins.length > 0) {
      config.plugins.forEach((plugin) => {
        if (plugin.init) {
          plugin.init(config);
        }

        // 플러그인 훅을 메타데이터에 등록
        if (plugin.registerHooks) {
          const hooks = plugin.registerHooks();
          const pluginName = plugin.name || 'unknown';

          // Before 훅 등록
          if (hooks.before) {
            Object.entries(hooks.before).forEach(([operation, hookFn]) => {
              if (!hookFn) return; // hookFn이 undefined인 경우 건너뛰기

              CrudHookMetadataStorage.addHook(target, {
                type: this.getBeforeHookType(operation as CrudOperation),
                methodName: `${pluginName}_before_${operation}`,
                operations: [operation as CrudOperation],
                priority: -100, // 플러그인 훅은 낮은 우선순위 (먼저 실행)
              });

              // 훅 함수를 프로토타입에 추가
              target.prototype[`${pluginName}_before_${operation}`] = hookFn;
            });
          }

          // After 훅 등록
          if (hooks.after) {
            Object.entries(hooks.after).forEach(([operation, hookFn]) => {
              if (!hookFn) return; // hookFn이 undefined인 경우 건너뛰기

              CrudHookMetadataStorage.addHook(target, {
                type: this.getAfterHookType(operation as CrudOperation),
                methodName: `${pluginName}_after_${operation}`,
                operations: [operation as CrudOperation],
                priority: 100, // 플러그인 훅은 높은 우선순위 (나중에 실행)
              });

              // 훅 함수를 프로토타입에 추가
              target.prototype[`${pluginName}_after_${operation}`] = hookFn;
            });
          }
        }
      });
    }

    // 2. Swagger 태그 적용 (resourceType 기반)
    if (config.resourceType) {
      ApiTags(config.resourceType)(target);
    }

    // 3. 각 CRUD 작업별 라우트 생성
    config.only.forEach((operation) => {
      const generator = this.routeGenerators[operation];
      if (generator) {
        generator(target.prototype, config);
      }
    });

    // 4. 커스텀 라우트 생성 (routes에 CrudOperation이 아닌 문자열 키가 있는 경우)
    if (config.routes) {
      Object.keys(config.routes).forEach((key) => {
        if (!Object.values(CrudOperation).includes(key as CrudOperation)) {
          this.createCustomRoute(target.prototype, key, config);
        }
      });
    }
  }

  /**
   * CRUD 작업에 대응하는 Before 훅 타입 반환
   */
  private static getBeforeHookType(operation: CrudOperation): CrudHookType {
    const hookMap: Record<CrudOperation, CrudHookType> = {
      [CrudOperation.Index]: CrudHookType.BeforeModelInit,
      [CrudOperation.Show]: CrudHookType.BeforeModelInit,
      [CrudOperation.Create]: CrudHookType.BeforeCreate,
      [CrudOperation.Update]: CrudHookType.BeforeUpdate,
      [CrudOperation.Delete]: CrudHookType.BeforeDelete,
    };
    return hookMap[operation] || CrudHookType.BeforeCustom;
  }

  /**
   * CRUD 작업에 대응하는 After 훅 타입 반환
   */
  private static getAfterHookType(operation: CrudOperation): CrudHookType {
    const hookMap: Record<CrudOperation, CrudHookType> = {
      [CrudOperation.Index]: CrudHookType.AfterModelInit,
      [CrudOperation.Show]: CrudHookType.AfterModelInit,
      [CrudOperation.Create]: CrudHookType.AfterCreate,
      [CrudOperation.Update]: CrudHookType.AfterUpdate,
      [CrudOperation.Delete]: CrudHookType.AfterDelete,
    };
    return hookMap[operation] || CrudHookType.AfterCustom;
  }

  /**
   * Index 라우트 생성: GET /resources
   *
   * 기능:
   * - 목록 조회
   * - 필터링 (allowedFilters)
   * - 정렬 (allowedSorts)
   * - 페이지네이션
   * - 관계 포함 (allowedIncludes)
   */
  private static createIndexRoute(target: any, config: CrudConfig): void {
    const routeConfig = config.routes?.[CrudOperation.Index];
    const serviceName = CrudRouteFactory.getServicePropertyName(target);

    // 라우트 핸들러 함수 생성
    const handler = async function (this: any, query: any) {
      // 쿼리 파라미터 파싱
      const options: any = {};

      // 필터 파싱
      if (query.filter) {
        options.filter = query.filter;
      }

      // 정렬 파싱
      if (query.sort) {
        const sorts = Array.isArray(query.sort) ? query.sort : [query.sort];
        options.sort = sorts.map((s: string) => {
          const order = s.startsWith('-') ? 'DESC' : 'ASC';
          const field = s.startsWith('-') ? s.substring(1) : s;
          return { field, order };
        });
      }

      // 페이지네이션 파싱
      if (query['page[number]'] || query['page[size]']) {
        options.page = {
          number: parseInt(query['page[number]'] || '1', 10),
          size: parseInt(
            query['page[size]'] ||
              String(routeConfig?.pagination?.defaultLimit || 20),
            10,
          ),
        };
      }

      // Service의 findAll 호출
      return this[serviceName].findAll(options);
    };

    // 프로토타입에 메서드 먼저 추가
    target.index = handler;

    // 데코레이터 적용
    const descriptor = Object.getOwnPropertyDescriptor(target, 'index');
    if (!descriptor) {
      throw new Error('Failed to create index route descriptor');
    }
    Get()(target, 'index', descriptor);

    // JSON:API 리소스 타입 메타데이터 추가
    if (config.resourceType) {
      JsonApiResource(config.resourceType)(target, 'index', descriptor);
    }

    // Swagger 문서 적용
    if (routeConfig?.swagger?.summary) {
      ApiOperation({ summary: routeConfig.swagger.summary })(target, 'index', descriptor);
    } else {
      ApiOperation({ summary: `${config.resourceType || 'Resource'} 목록 조회` })(
        target,
        'index',
        descriptor,
      );
    }

    ApiResponse({
      status: 200,
      description: '목록 조회 성공',
    })(target, 'index', descriptor);
  }

  /**
   * Show 라우트 생성: GET /resources/:id
   *
   * 기능:
   * - 단일 리소스 조회
   * - 관계 포함 (allowedIncludes)
   */
  private static createShowRoute(target: any, config: CrudConfig): void {
    const routeConfig = config.routes?.[CrudOperation.Show];
    const serviceName = CrudRouteFactory.getServicePropertyName(target);

    const handler = async function (this: any, id: string, query: any) {
      const options: any = {};

      // Sparse Fieldsets 파싱
      if (query[`fields[${config.resourceType}]`]) {
        options.fields = query[`fields[${config.resourceType}]`].split(',');
      }

      return this[serviceName].findOne(id, options.fields);
    };

    // 프로토타입에 메서드 먼저 추가
    target.show = handler;

    // 데코레이터 적용
    const descriptor = Object.getOwnPropertyDescriptor(target, 'show');
    if (!descriptor) {
      throw new Error('Failed to create show route descriptor');
    }
    Get(':id')(target, 'show', descriptor);

    // JSON:API 리소스 타입 메타데이터 추가
    if (config.resourceType) {
      JsonApiResource(config.resourceType)(target, 'show', descriptor);
    }

    // Swagger 문서
    ApiOperation({
      summary:
        routeConfig?.swagger?.summary ||
        `${config.resourceType || 'Resource'} 상세 조회`,
    })(target, 'show', descriptor);

    ApiResponse({
      status: 200,
      description: '조회 성공',
    })(target, 'show', descriptor);

    ApiResponse({
      status: 404,
      description: '리소스를 찾을 수 없음',
    })(target, 'show', descriptor);
  }

  /**
   * Create 라우트 생성: POST /resources
   *
   * 기능:
   * - 리소스 생성
   * - DTO 검증
   * - 파라미터 화이트리스트
   */
  private static createCreateRoute(target: any, config: CrudConfig): void {
    const routeConfig = config.routes?.[CrudOperation.Create];
    const serviceName = CrudRouteFactory.getServicePropertyName(target);

    const handler = async function (this: any, body: any) {
      // 허용된 파라미터만 추출 (화이트리스트)
      // JsonApiTransformMiddleware가 이미 data.attributes를 추출했음
      const allowedParams =
        routeConfig?.allowedParams || config.allowedParams || {};

      // allowedParams가 비어있으면 body를 그대로 사용
      if (Object.keys(allowedParams).length === 0) {
        return this[serviceName].create(body);
      }

      const dto: any = {};
      Object.keys(allowedParams).forEach((key) => {
        if (body[key] !== undefined) {
          dto[key] = body[key];
        }
      });

      return this[serviceName].create(dto);
    };

    // 프로토타입에 메서드 먼저 추가
    target.create = handler;

    // 데코레이터 적용
    const descriptor = Object.getOwnPropertyDescriptor(target, 'create');
    if (!descriptor) {
      throw new Error('Failed to create create route descriptor');
    }
    Post()(target, 'create', descriptor);
    HttpCode(HttpStatus.CREATED)(target, 'create', descriptor);

    // JSON:API 리소스 타입 메타데이터 추가
    if (config.resourceType) {
      JsonApiResource(config.resourceType)(target, 'create', descriptor);
    }

    // Swagger 문서
    ApiOperation({
      summary:
        routeConfig?.swagger?.summary ||
        `${config.resourceType || 'Resource'} 생성`,
    })(target, 'create', descriptor);

    ApiResponse({
      status: 201,
      description: '생성 성공',
    })(target, 'create', descriptor);

    ApiResponse({
      status: 400,
      description: '잘못된 요청',
    })(target, 'create', descriptor);
  }

  /**
   * Update 라우트 생성: PATCH /resources/:id
   *
   * 기능:
   * - 리소스 수정
   * - DTO 검증
   * - 파라미터 화이트리스트
   */
  private static createUpdateRoute(target: any, config: CrudConfig): void {
    const routeConfig = config.routes?.[CrudOperation.Update];
    const serviceName = CrudRouteFactory.getServicePropertyName(target);

    const handler = async function (this: any, id: string, body: any) {
      // 허용된 파라미터만 추출
      // JsonApiTransformMiddleware가 이미 data.attributes를 추출했음
      const allowedParams =
        routeConfig?.allowedParams || config.allowedParams || {};

      // allowedParams가 비어있으면 body를 그대로 사용
      if (Object.keys(allowedParams).length === 0) {
        return this[serviceName].update(id, body);
      }

      const dto: any = {};
      Object.keys(allowedParams).forEach((key) => {
        if (body[key] !== undefined) {
          dto[key] = body[key];
        }
      });

      return this[serviceName].update(id, dto);
    };

    // 프로토타입에 메서드 먼저 추가
    target.update = handler;

    // 데코레이터 적용
    const descriptor = Object.getOwnPropertyDescriptor(target, 'update');
    if (!descriptor) {
      throw new Error('Failed to create update route descriptor');
    }
    Patch(':id')(target, 'update', descriptor);

    // JSON:API 리소스 타입 메타데이터 추가
    if (config.resourceType) {
      JsonApiResource(config.resourceType)(target, 'update', descriptor);
    }

    // Swagger 문서
    ApiOperation({
      summary:
        routeConfig?.swagger?.summary ||
        `${config.resourceType || 'Resource'} 수정`,
    })(target, 'update', descriptor);

    ApiResponse({
      status: 200,
      description: '수정 성공',
    })(target, 'update', descriptor);

    ApiResponse({
      status: 404,
      description: '리소스를 찾을 수 없음',
    })(target, 'update', descriptor);
  }

  /**
   * Delete 라우트 생성: DELETE /resources/:id
   *
   * 기능:
   * - 리소스 삭제 (Hard Delete or Soft Delete)
   */
  private static createDeleteRoute(target: any, config: CrudConfig): void {
    const routeConfig = config.routes?.[CrudOperation.Delete];
    const serviceName = CrudRouteFactory.getServicePropertyName(target);

    const handler = async function (this: any, id: string) {
      return this[serviceName].remove(id);
    };

    // 프로토타입에 메서드 먼저 추가
    target.delete = handler;

    // 데코레이터 적용
    const descriptor = Object.getOwnPropertyDescriptor(target, 'delete');
    if (!descriptor) {
      throw new Error('Failed to create delete route descriptor');
    }
    Delete(':id')(target, 'delete', descriptor);
    HttpCode(HttpStatus.NO_CONTENT)(target, 'delete', descriptor);

    // JSON:API 리소스 타입 메타데이터 추가
    if (config.resourceType) {
      JsonApiResource(config.resourceType)(target, 'delete', descriptor);
    }

    // Swagger 문서
    ApiOperation({
      summary:
        routeConfig?.swagger?.summary ||
        `${config.resourceType || 'Resource'} 삭제`,
    })(target, 'delete', descriptor);

    ApiResponse({
      status: 204,
      description: '삭제 성공',
    })(target, 'delete', descriptor);

    ApiResponse({
      status: 404,
      description: '리소스를 찾을 수 없음',
    })(target, 'delete', descriptor);
  }

  /**
   * 커스텀 라우트 생성
   *
   * routes 설정에 커스텀 함수 이름이 있는 경우 처리
   */
  private static createCustomRoute(
    target: any,
    routeName: string,
    config: CrudConfig,
  ): void {
    const routeConfig = config.routes?.[routeName];
    if (!routeConfig) return;

    const method = routeConfig.method || 'POST';
    const path = routeConfig.path || routeName;
    const serviceName = CrudRouteFactory.getServicePropertyName(target);

    const handler = async function (this: any, ...args: any[]) {
      // Service에 동일한 이름의 메서드가 있으면 호출
      if (this[serviceName] && typeof this[serviceName][routeName] === 'function') {
        return this[serviceName][routeName](...args);
      }
      throw new Error(`Service method '${routeName}' not found`);
    };

    // 프로토타입에 메서드 먼저 추가
    target[routeName] = handler;

    // HTTP 메서드에 따라 데코레이터 적용
    const methodDecorators: Record<string, any> = {
      GET: Get,
      POST: Post,
      PATCH: Patch,
      PUT: Patch,
      DELETE: Delete,
    };

    const descriptor = Object.getOwnPropertyDescriptor(target, routeName);
    if (!descriptor) {
      throw new Error(`Failed to create custom route descriptor for '${routeName}'`);
    }

    const decorator = methodDecorators[method];
    if (decorator) {
      decorator(path)(target, routeName, descriptor);
    }

    // Swagger 문서
    if (routeConfig.swagger?.summary) {
      ApiOperation({ summary: routeConfig.swagger.summary })(
        target,
        routeName,
        descriptor,
      );
    }
  }

  /**
   * Service 프로퍼티 이름 추론
   *
   * Controller 생성자에서 주입된 Service의 프로퍼티 이름을 찾습니다.
   * 예: constructor(private readonly usersService: UsersService)
   *      → 'usersService'
   */
  private static getServicePropertyName(target: any): string {
    // 생성자 파라미터 이름 추출
    const constructor = target.constructor;
    if (!constructor) return 'service';

    // 첫 번째 파라미터를 서비스로 가정
    // (일반적으로 첫 번째 의존성이 CRUD Service)
    const params = Reflect.getMetadata('design:paramtypes', constructor) || [];
    if (params.length === 0) return 'service';

    // 프로퍼티 키 찾기
    const keys = Object.getOwnPropertyNames(target);
    for (const key of keys) {
      if (key.includes('service') || key.includes('Service')) {
        return key;
      }
    }

    return 'service';
  }
}
