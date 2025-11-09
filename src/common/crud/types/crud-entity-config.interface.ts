/**
 * @CrudEntity 데코레이터 설정 인터페이스
 *
 * Entity 클래스에 메타데이터로 저장되는 CRUD 설정입니다.
 * 이 설정은 CrudBaseService가 자동으로 읽어서 적용합니다.
 */
export interface CrudEntityConfig {
  /**
   * Prisma 모델 이름 (소문자 단수형)
   *
   * @example 'user', 'post', 'comment'
   */
  modelName: string;

  /**
   * 허용된 Include 관계
   *
   * @example ['profile', 'posts', 'comments']
   */
  allowedIncludes?: string[];

  /**
   * 허용된 필터
   *
   * @example
   * ```typescript
   * {
   *   name: ['eq', 'like', 'ilike'],
   *   email: ['eq'],
   *   isActive: ['eq'],
   * }
   * ```
   */
  allowedFilters?: Record<string, string[]>;

  /**
   * 허용된 정렬 필드
   *
   * @example ['createdAt', 'name', 'email']
   */
  allowedSorts?: string[];

  /**
   * 직렬화 설정
   */
  serialize?: {
    /**
     * 응답에서 제외할 필드
     *
     * @example ['password', 'resetToken']
     */
    exclude?: string[];

    /**
     * 관계 직렬화 설정 (재귀적 직렬화)
     *
     * 키: 관계 필드명
     * 값: 관계 모델명 (소문자 단수형)
     *
     * @example
     * ```typescript
     * {
     *   comments: 'comment',  // comments 관계 → comment 모델 서비스 사용
     *   author: 'user',       // author 관계 → user 모델 서비스 사용
     * }
     * ```
     */
    relations?: Record<string, string>;
  };

  /**
   * 성능 최적화 설정
   */
  performance?: {
    query?: {
      /**
       * N+1 쿼리 자동 최적화 (Eager Loading)
       *
       * @default false
       */
      eagerLoad?: boolean;
    };
  };
}
