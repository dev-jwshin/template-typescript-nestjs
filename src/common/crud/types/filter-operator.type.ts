/**
 * 필터 연산자 타입 정의
 *
 * 데이터베이스 쿼리에서 사용할 수 있는 필터 연산자를 정의합니다.
 * 각 연산자는 클라이언트가 API 요청 시 사용할 수 있는 필터링 옵션입니다.
 */
export type FilterOperator =
  | 'eq' // Equal (=) - 정확히 일치
  | 'ne' // Not Equal (!=) - 일치하지 않음
  | 'gt' // Greater Than (>) - 초과
  | 'gte' // Greater Than or Equal (>=) - 이상
  | 'lt' // Less Than (<) - 미만
  | 'lte' // Less Than or Equal (<=) - 이하
  | 'like' // SQL LIKE (대소문자 구분) - 패턴 매칭
  | 'ilike' // SQL ILIKE (대소문자 무시) - 대소문자 무시 패턴 매칭
  | 'in' // IN (배열) - 배열 내 포함 여부
  | 'nin' // NOT IN (배열) - 배열 내 미포함 여부
  | 'between' // BETWEEN (범위) - 범위 내 포함 여부
  | 'isNull' // IS NULL - NULL 체크
  | 'isNotNull'; // IS NOT NULL - NOT NULL 체크
