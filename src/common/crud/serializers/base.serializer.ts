/**
 * BaseSerializer
 *
 * 파일 기반 Serializer의 추상 클래스
 * - 각 Entity는 [entity].serializer.ts 파일로 직렬화 규칙 관리
 * - 재귀적 관계 직렬화 지원
 * - 타입 안전성 보장
 *
 * @example
 * ```typescript
 * // user.serializer.ts
 * export class UserSerializer extends BaseSerializer<User> {
 *   protected excludeFields = ['password', 'resetToken'];
 *   protected relations = {
 *     profile: 'profile',
 *     posts: 'post',
 *   };
 *
 *   protected transform(data: Partial<User>): Partial<User> {
 *     return {
 *       ...data,
 *       fullName: `${data.firstName} ${data.lastName}`,
 *     };
 *   }
 * }
 * ```
 */
export abstract class BaseSerializer<T = any> {
  /**
   * 응답에서 제외할 필드 목록
   *
   * @example
   * protected excludeFields = ['password', 'resetToken', 'apiKey'];
   */
  protected excludeFields?: string[];

  /**
   * 관계 직렬화 매핑
   *
   * 키: 관계 필드명 (Entity의 프로퍼티명)
   * 값: 관계 모델명 (Prisma 모델명, 소문자 단수형)
   *
   * @example
   * protected relations = {
   *   profile: 'profile',  // User.profile → Profile 모델
   *   posts: 'post',       // User.posts → Post 모델
   * };
   */
  protected relations?: Record<string, string>;

  /**
   * 포함할 필드 목록 (excludeFields와 반대 개념)
   *
   * - excludeFields가 우선순위가 높음
   * - includeFields를 설정하면 명시된 필드만 반환
   *
   * @example
   * protected includeFields = ['id', 'name', 'email', 'isActive'];
   */
  protected includeFields?: string[];

  /**
   * 엔티티 직렬화
   *
   * @param entity 원본 엔티티 (단일 또는 배열)
   * @param serializerRegistry 직렬화기 레지스트리 (재귀 호출용)
   * @returns 직렬화된 엔티티
   */
  serialize(
    entity: T | T[] | null | undefined,
    serializerRegistry?: Map<string, BaseSerializer>,
  ): Partial<T> | Partial<T>[] | null | undefined {
    if (!entity) {
      return entity;
    }

    // 배열인 경우 각 항목 직렬화
    if (Array.isArray(entity)) {
      return entity.map((item) => this.serialize(item, serializerRegistry) as Partial<T>);
    }

    // 1. 필드 제외 처리
    let serialized: any = { ...entity };

    // 1.1 excludeFields 처리
    if (this.excludeFields) {
      this.excludeFields.forEach((field) => {
        delete serialized[field];
      });
    }

    // 1.2 includeFields 처리 (excludeFields 이후 적용)
    if (this.includeFields) {
      const included: any = {};
      this.includeFields.forEach((field) => {
        if (serialized[field] !== undefined) {
          included[field] = serialized[field];
        }
      });
      serialized = included;
    }

    // 2. 재귀적 관계 직렬화
    if (this.relations && serializerRegistry) {
      Object.entries(this.relations).forEach(([relationField, modelName]) => {
        const relationData = serialized[relationField];

        // 관계 데이터가 존재하는 경우에만 처리
        if (relationData !== undefined && relationData !== null) {
          const relationSerializer = serializerRegistry.get(modelName);

          if (relationSerializer) {
            serialized[relationField] = relationSerializer.serialize(
              relationData,
              serializerRegistry,
            );
          }
        }
      });
    }

    // 3. 커스텀 변환 함수 적용
    serialized = this.transform(serialized);

    return serialized;
  }

  /**
   * 커스텀 변환 함수
   *
   * 서브클래스에서 오버라이드하여 추가 변환 로직 구현
   *
   * @param data 직렬화 중인 데이터
   * @returns 변환된 데이터
   *
   * @example
   * protected transform(data: Partial<User>): Partial<User> {
   *   return {
   *     ...data,
   *     fullName: `${data.firstName} ${data.lastName}`,
   *     age: this.calculateAge(data.birthDate),
   *   };
   * }
   */
  protected transform(data: Partial<T>): Partial<T> {
    return data;
  }

  /**
   * Serializer 설정 가져오기
   *
   * @returns excludeFields, relations, includeFields
   */
  getConfig(): {
    excludeFields?: string[];
    relations?: Record<string, string>;
    includeFields?: string[];
  } {
    return {
      excludeFields: this.excludeFields,
      relations: this.relations,
      includeFields: this.includeFields,
    };
  }
}
