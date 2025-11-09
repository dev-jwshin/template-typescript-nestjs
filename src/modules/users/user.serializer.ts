import { BaseSerializer } from '../../common/crud/serializers/base.serializer';
import { User } from './user.entity';

/**
 * UserSerializer
 *
 * User 엔티티의 직렬화 규칙 정의
 * - 민감 정보 (password) 자동 제외
 * - 관계 데이터 직렬화 설정
 *
 * @example
 * ```typescript
 * const userSerializer = new UserSerializer();
 * const serialized = userSerializer.serialize(user);
 * // {
 * //   id: '123',
 * //   name: 'John Doe',
 * //   email: 'john@example.com',
 * //   // password는 자동 제외됨
 * // }
 * ```
 */
export class UserSerializer extends BaseSerializer<User> {
  /**
   * 응답에서 제외할 필드
   *
   * - password: 보안상 민감한 정보
   */
  protected excludeFields = ['password'];

  /**
   * 관계 직렬화 설정
   *
   * - profile: User.profile → Profile 모델 (profile serializer 적용)
   */
  protected relations = {
    profile: 'profile', // User.profile → ProfileSerializer 사용
    // posts: 'post',       // User.posts → PostSerializer 사용 (예시)
  };

  /**
   * 커스텀 변환 함수
   *
   * 예시: fullName 필드 추가, age 계산 등
   *
   * @param data 직렬화 중인 데이터
   * @returns 변환된 데이터
   */
  protected transform(data: Partial<User>): Partial<User> {
    // 기본 변환만 수행 (추가 변환 없음)
    return data;

    // 예시: 추가 변환이 필요한 경우
    // return {
    //   ...data,
    //   fullName: `${data.firstName} ${data.lastName}`,
    //   age: this.calculateAge(data.birthDate),
    // };
  }

  /**
   * 예시: 나이 계산 헬퍼 메서드
   */
  // private calculateAge(birthDate?: Date): number | undefined {
  //   if (!birthDate) return undefined;
  //   const today = new Date();
  //   const age = today.getFullYear() - birthDate.getFullYear();
  //   const monthDiff = today.getMonth() - birthDate.getMonth();
  //   if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
  //     return age - 1;
  //   }
  //   return age;
  // }
}
