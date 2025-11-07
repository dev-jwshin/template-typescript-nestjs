/**
 * CRUD 작업 타입 정의 (Enum)
 *
 * 표준 CRUD 작업과 HTTP 메서드를 매핑합니다.
 * 각 작업은 자동으로 생성될 엔드포인트를 나타냅니다.
 */
export enum CrudOperation {
  /** GET /resources - 목록 조회 */
  Index = 'index',

  /** GET /resources/:id - 단일 조회 */
  Show = 'show',

  /** POST /resources - 생성 */
  Create = 'create',

  /** PATCH /resources/:id - 수정 */
  Update = 'update',

  /** DELETE /resources/:id - 삭제 */
  Delete = 'delete',
}
