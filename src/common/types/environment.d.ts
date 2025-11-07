/**
 * 환경 변수 타입 정의
 * - 타입 안전한 환경 변수 접근
 */
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      // 애플리케이션 설정
      NODE_ENV: 'development' | 'production' | 'test';
      PORT: string;

      // CORS 설정
      CORS_ORIGIN: string;

      // 데이터베이스 설정 (예시)
      DATABASE_HOST?: string;
      DATABASE_PORT?: string;
      DATABASE_USER?: string;
      DATABASE_PASSWORD?: string;
      DATABASE_NAME?: string;

      // JWT 설정 (예시)
      JWT_SECRET?: string;
      JWT_EXPIRATION?: string;

      // API 키 (예시)
      API_KEY?: string;
    }
  }
}

export {};
