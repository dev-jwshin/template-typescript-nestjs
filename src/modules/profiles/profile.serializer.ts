import { BaseSerializer } from '../../common/crud/serializers/base.serializer';
import { Profile } from './profile.entity';

/**
 * ProfileSerializer
 *
 * Profile 엔티티의 직렬화 규칙 정의
 * - 민감 정보 (phone) 자동 제외
 * - 관계 데이터 직렬화 설정
 *
 * @example
 * ```typescript
 * const profileSerializer = new ProfileSerializer();
 * const serialized = profileSerializer.serialize(profile);
 * // {
 * //   id: '456',
 * //   bio: 'Software Engineer',
 * //   avatar: 'https://example.com/avatar.jpg',
 * //   // phone은 자동 제외됨
 * // }
 * ```
 */
export class ProfileSerializer extends BaseSerializer<Profile> {
  /**
   * 응답에서 제외할 필드
   *
   * - phone: 개인 정보 보호를 위해 제외
   */
  protected excludeFields = ['phone'];

  /**
   * 관계 직렬화 설정
   *
   * - user: Profile.user → User 모델 (user serializer 적용)
   */
  protected relations = {
    user: 'user', // Profile.user → UserSerializer 사용
  };

  /**
   * 커스텀 변환 함수
   *
   * @param data 직렬화 중인 데이터
   * @returns 변환된 데이터
   */
  protected transform(data: Partial<Profile>): Partial<Profile> {
    // 기본 변환만 수행
    return data;
  }
}
