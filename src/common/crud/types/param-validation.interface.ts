/**
 * 파라미터 검증 설정 인터페이스
 *
 * allowedParams에서 각 파라미터의 검증 규칙을 정의합니다.
 * 타입 강제, 유효성 검증, 기본값 설정 등을 지원합니다.
 */
export interface ParamValidation {
  /**
   * 타입 강제 (선택)
   *
   * 클라이언트로부터 받은 값을 지정된 타입으로 변환합니다.
   * 예: "true" 문자열 → true 불리언
   */
  type?: 'string' | 'number' | 'boolean' | 'date' | 'array' | 'object';

  /**
   * class-validator 데코레이터 배열
   *
   * 유효성 검증을 위한 데코레이터 목록입니다.
   * 예: [IsEmail(), IsNotEmpty()]
   */
  validate?: Array<PropertyDecorator>;

  /**
   * 커스텀 변환 함수 (선택)
   *
   * 값을 받은 후 저장하기 전에 커스텀 변환을 수행합니다.
   * 예: (value) => value.toLowerCase()
   */
  transform?: (value: any) => any;

  /**
   * 기본값 (선택)
   *
   * 클라이언트가 해당 파라미터를 보내지 않았을 때 사용할 기본값입니다.
   */
  default?: any;

  /**
   * 필수 여부 (선택, 기본값: false)
   *
   * true인 경우 클라이언트가 반드시 해당 파라미터를 보내야 합니다.
   */
  required?: boolean;

  /**
   * 설명 (Swagger 문서용)
   *
   * API 문서에 표시될 파라미터 설명입니다.
   */
  description?: string;

  /**
   * 예시 값 (Swagger 문서용)
   *
   * API 문서에 표시될 예시 값입니다.
   */
  example?: any;
}
