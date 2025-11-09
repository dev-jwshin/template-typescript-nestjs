import { LoggingInterceptor } from './logging.interceptor';
import { ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { of } from 'rxjs';

describe('LoggingInterceptor', () => {
  let interceptor: LoggingInterceptor;
  let mockExecutionContext: ExecutionContext;
  let mockCallHandler: CallHandler;
  let loggerSpy: jest.SpyInstance;

  beforeEach(() => {
    interceptor = new LoggingInterceptor();

    mockExecutionContext = {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({
          method: 'GET',
          url: '/test',
        }),
      }),
      getClass: jest.fn().mockReturnValue({ name: 'TestController' }),
      getHandler: jest.fn().mockReturnValue({ name: 'testMethod' }),
      getArgs: jest.fn(),
      getArgByIndex: jest.fn(),
      switchToRpc: jest.fn(),
      switchToWs: jest.fn(),
      getType: jest.fn(),
    } as any;

    mockCallHandler = {
      handle: jest.fn().mockReturnValue(of('test data')),
    };

    loggerSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
  });

  afterEach(() => {
    loggerSpy.mockRestore();
  });

  it('should be defined', () => {
    expect(interceptor).toBeDefined();
  });

  describe('intercept', () => {
    it('should log request and response', (done) => {
      interceptor
        .intercept(mockExecutionContext, mockCallHandler)
        .subscribe({
          next: (data) => {
            expect(data).toBe('test data');
            expect(loggerSpy).toHaveBeenCalled();
            done();
          },
        });
    });

    it('should measure execution time', (done) => {
      interceptor
        .intercept(mockExecutionContext, mockCallHandler)
        .subscribe({
          next: () => {
            expect(loggerSpy).toHaveBeenCalledWith(
              expect.stringContaining('ms'),
            );
            done();
          },
        });
    });

    it('should include request method and URL', (done) => {
      interceptor
        .intercept(mockExecutionContext, mockCallHandler)
        .subscribe({
          next: () => {
            const calls = loggerSpy.mock.calls.flat();
            const allLogs = calls.join(' ');
            expect(allLogs).toContain('GET');
            expect(allLogs).toContain('/test');
            done();
          },
        });
    });
  });
});
