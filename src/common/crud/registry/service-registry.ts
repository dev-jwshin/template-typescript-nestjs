/**
 * CRUD 서비스 레지스트리
 *
 * 재귀적 직렬화를 위해 관계 모델의 서비스를 조회하는 전역 레지스트리입니다.
 * 각 서비스는 모듈 초기화 시 자동으로 등록됩니다.
 *
 * 사용 예시:
 * ```typescript
 * // 서비스 등록 (자동)
 * ServiceRegistry.register('comment', commentsService);
 *
 * // 서비스 조회
 * const commentService = ServiceRegistry.get('comment');
 * ```
 */
export class ServiceRegistry {
  /**
   * 서비스 저장소 (모델명 → 서비스 인스턴스)
   */
  private static services: Map<string, any> = new Map();

  /**
   * 서비스 등록
   *
   * @param modelName Prisma 모델 이름 (소문자, 단수형)
   * @param service 서비스 인스턴스
   */
  static register(modelName: string, service: any): void {
    this.services.set(modelName.toLowerCase(), service);
  }

  /**
   * 서비스 조회
   *
   * @param modelName Prisma 모델 이름 (소문자, 단수형)
   * @returns 서비스 인스턴스 또는 undefined
   */
  static get(modelName: string): any {
    return this.services.get(modelName.toLowerCase());
  }

  /**
   * 서비스 존재 여부 확인
   *
   * @param modelName Prisma 모델 이름 (소문자, 단수형)
   * @returns 존재 여부
   */
  static has(modelName: string): boolean {
    return this.services.has(modelName.toLowerCase());
  }

  /**
   * 모든 서비스 조회
   *
   * @returns 등록된 모든 서비스 맵
   */
  static getAll(): Map<string, any> {
    return new Map(this.services);
  }

  /**
   * 레지스트리 초기화 (주로 테스트용)
   */
  static clear(): void {
    this.services.clear();
  }
}
