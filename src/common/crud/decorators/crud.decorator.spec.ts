import { Crud } from './crud.decorator';
import { CrudMetadataStorage } from '../metadata';
import { CrudRouteFactory } from '../factories/crud-route.factory';
import { CrudOperation } from '../types';

// 모킹
jest.mock('../metadata');
jest.mock('../factories/crud-route.factory');

describe('@Crud Decorator', () => {
  let mockController: any;
  let consoleLogSpy: jest.SpyInstance;

  beforeEach(() => {
    // 테스트용 컨트롤러 클래스
    class TestController {
      constructor() {}
    }
    mockController = TestController;

    // 모킹 초기화
    jest.clearAllMocks();

    // console.log 모킹
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  it('메타데이터를 저장해야 함', () => {
    const config = {
      only: [CrudOperation.Index, CrudOperation.Show],
      resourceType: 'users',
      allowedIncludes: ['profile'],
    };

    const decorator = Crud(config);
    decorator(mockController);

    expect(CrudMetadataStorage.setCrudConfig).toHaveBeenCalledWith(
      mockController,
      config,
    );
  });

  it('라우트를 자동 생성해야 함', () => {
    const config = {
      only: [CrudOperation.Index, CrudOperation.Show],
      resourceType: 'users',
    };

    const decorator = Crud(config);
    decorator(mockController);

    expect(CrudRouteFactory.generateRoutes).toHaveBeenCalledWith(
      mockController,
      config,
    );
  });

  it('플러그인 init 메서드를 호출해야 함', () => {
    const mockPlugin = {
      name: 'test-plugin',
      version: '1.0.0',
      init: jest.fn(),
    };

    const config = {
      only: [CrudOperation.Index],
      plugins: [mockPlugin],
    };

    const decorator = Crud(config);
    decorator(mockController);

    expect(mockPlugin.init).toHaveBeenCalledWith(config);
  });

  it('플러그인이 없으면 init을 호출하지 않아야 함', () => {
    const config = {
      only: [CrudOperation.Index],
    };

    const decorator = Crud(config);
    decorator(mockController);

    // 에러 없이 실행되어야 함
    expect(CrudMetadataStorage.setCrudConfig).toHaveBeenCalled();
  });

  it('플러그인에 init 메서드가 없어도 에러가 발생하지 않아야 함', () => {
    const mockPlugin = {
      name: 'test-plugin',
      version: '1.0.0',
      // init 메서드 없음
    };

    const config = {
      only: [CrudOperation.Index],
      plugins: [mockPlugin],
    };

    const decorator = Crud(config);
    decorator(mockController);

    expect(CrudMetadataStorage.setCrudConfig).toHaveBeenCalled();
  });

  it('개발 환경에서 디버그 로그를 출력해야 함', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    const config = {
      only: [CrudOperation.Index, CrudOperation.Show],
      resourceType: 'users',
      performance: {
        query: {
          eagerLoad: true,
        },
      },
    };

    const decorator = Crud(config);
    decorator(mockController);

    expect(consoleLogSpy).toHaveBeenCalled();

    process.env.NODE_ENV = originalEnv;
  });

  it('프로덕션 환경에서 디버그 로그를 출력하지 않아야 함', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    const config = {
      only: [CrudOperation.Index],
      resourceType: 'users',
    };

    const decorator = Crud(config);
    decorator(mockController);

    expect(consoleLogSpy).not.toHaveBeenCalled();

    process.env.NODE_ENV = originalEnv;
  });

  it('여러 operation을 지원해야 함', () => {
    const config = {
      only: [
        CrudOperation.Index,
        CrudOperation.Show,
        CrudOperation.Create,
        CrudOperation.Update,
        CrudOperation.Delete,
      ],
      resourceType: 'users',
    };

    const decorator = Crud(config);
    decorator(mockController);

    expect(CrudMetadataStorage.setCrudConfig).toHaveBeenCalledWith(
      mockController,
      config,
    );
    expect(CrudRouteFactory.generateRoutes).toHaveBeenCalledWith(
      mockController,
      config,
    );
  });

  it('성능 최적화 옵션을 지원해야 함', () => {
    const config = {
      only: [CrudOperation.Index],
      resourceType: 'users',
      performance: {
        query: {
          eagerLoad: true,
          prefetch: true,
          batchSize: 50,
        },
        cache: {
          enabled: true,
          ttl: 300,
        },
      },
    };

    const decorator = Crud(config);
    decorator(mockController);

    expect(CrudMetadataStorage.setCrudConfig).toHaveBeenCalledWith(
      mockController,
      config,
    );
  });
});
