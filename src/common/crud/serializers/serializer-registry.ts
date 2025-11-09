import { BaseSerializer } from './base.serializer';

/**
 * SerializerRegistry
 *
 * Serializer 인스턴스를 전역으로 관리하는 레지스트리
 * - 모델명(Prisma 모델명) → Serializer 인스턴스 매핑
 * - 재귀적 직렬화를 위한 Serializer 조회
 * - 자동 발견 및 등록 지원
 *
 * @example
 * ```typescript
 * // 등록
 * SerializerRegistry.register('user', new UserSerializer());
 * SerializerRegistry.register('profile', new ProfileSerializer());
 *
 * // 조회
 * const userSerializer = SerializerRegistry.get('user');
 * const serialized = userSerializer.serialize(user);
 * ```
 */
export class SerializerRegistry {
  /**
   * 모델명 → Serializer 인스턴스 매핑
   *
   * 키: Prisma 모델명 (소문자 단수형) - 예: 'user', 'post', 'profile'
   * 값: BaseSerializer 인스턴스
   */
  private static serializers = new Map<string, BaseSerializer>();

  /**
   * Serializer 등록
   *
   * @param modelName Prisma 모델명 (소문자 단수형)
   * @param serializer Serializer 인스턴스
   *
   * @example
   * ```typescript
   * SerializerRegistry.register('user', new UserSerializer());
   * SerializerRegistry.register('post', new PostSerializer());
   * ```
   */
  static register(modelName: string, serializer: BaseSerializer): void {
    this.serializers.set(modelName, serializer);
  }

  /**
   * Serializer 조회
   *
   * @param modelName Prisma 모델명 (소문자 단수형)
   * @returns Serializer 인스턴스 또는 undefined
   *
   * @example
   * ```typescript
   * const userSerializer = SerializerRegistry.get('user');
   * if (userSerializer) {
   *   const serialized = userSerializer.serialize(user);
   * }
   * ```
   */
  static get(modelName: string): BaseSerializer | undefined {
    return this.serializers.get(modelName);
  }

  /**
   * 등록된 모든 Serializer 조회
   *
   * @returns Map<모델명, Serializer 인스턴스>
   */
  static getAll(): Map<string, BaseSerializer> {
    return new Map(this.serializers);
  }

  /**
   * 특정 Serializer 등록 여부 확인
   *
   * @param modelName Prisma 모델명
   * @returns 등록 여부
   */
  static has(modelName: string): boolean {
    return this.serializers.has(modelName);
  }

  /**
   * Serializer 등록 해제
   *
   * @param modelName Prisma 모델명
   * @returns 삭제 성공 여부
   */
  static unregister(modelName: string): boolean {
    return this.serializers.delete(modelName);
  }

  /**
   * 모든 Serializer 초기화
   *
   * 주로 테스트용으로 사용
   */
  static clear(): void {
    this.serializers.clear();
  }

  /**
   * 등록된 Serializer 개수
   *
   * @returns 등록된 Serializer 수
   */
  static size(): number {
    return this.serializers.size;
  }

  /**
   * 등록된 모든 모델명 목록
   *
   * @returns 모델명 배열
   */
  static getModelNames(): string[] {
    return Array.from(this.serializers.keys());
  }
}
