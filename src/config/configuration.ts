/**
 * 중앙화된 환경 변수 설정
 *
 * @description
 * 모든 환경 변수를 한 곳에서 관리하고 기본값을 제공합니다.
 * ConfigService를 통해 타입 안전하게 접근할 수 있습니다.
 *
 * @example
 * ```typescript
 * // 사용 예시
 * constructor(private configService: ConfigService) {
 *   const port = this.configService.get<number>('app.port');
 *   const dbUrl = this.configService.get<string>('database.url');
 * }
 * ```
 */
export default () => ({
  /**
   * 애플리케이션 설정
   */
  app: {
    nodeEnv: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT, 10) || 3000,
    apiPrefix: process.env.API_PREFIX || 'api',
  },

  /**
   * 데이터베이스 설정
   */
  database: {
    url: process.env.DATABASE_URL,
  },

  /**
   * 캐시 설정
   */
  cache: {
    driver: process.env.CACHE_DRIVER || 'memory',
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0', 10),
    },
    ttl: parseInt(process.env.CACHE_TTL || '3600', 10), // 기본 1시간
  },
});
