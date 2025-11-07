import { CrudPlugin, CrudConfig, CrudOperation, CrudRequest } from '../types';

/**
 * 감사 로그 플러그인
 *
 * 모든 Create/Update/Delete 작업을 자동으로 로깅합니다.
 *
 * 기능:
 * - 작업 유형 기록 (CREATE, UPDATE, DELETE)
 * - 사용자 정보 기록 (req.user)
 * - 타임스탬프 기록
 * - IP 주소 기록
 * - 리소스 ID 기록
 *
 * 사용 예시:
 * ```typescript
 * @Crud({
 *   only: [CrudOperation.Create, CrudOperation.Update, CrudOperation.Delete],
 *   plugins: [AuditLogPlugin],
 * })
 * ```
 *
 * 데이터베이스 스키마 필요:
 * ```prisma
 * model AuditLog {
 *   id           String   @id @default(uuid())
 *   action       String
 *   resourceType String
 *   resourceId   String
 *   userId       String?
 *   ip           String?
 *   timestamp    DateTime @default(now())
 *
 *   @@map("audit_logs")
 * }
 * ```
 */
export const AuditLogPlugin: CrudPlugin = {
  name: 'audit-log',
  version: '1.0.0',

  /**
   * 플러그인 초기화
   */
  init(config: CrudConfig) {
    console.log(
      `[AuditLogPlugin] Initialized for resource: ${config.resourceType || 'unknown'}`,
    );
  },

  /**
   * 훅 등록
   */
  registerHooks() {
    return {
      after: {
        [CrudOperation.Create]: async (entity: any, req: CrudRequest) => {
          await logAudit({
            action: 'CREATE',
            resourceType: entity.constructor?.name || 'Unknown',
            resourceId: entity.id,
            userId: req.user?.id || req.user?.sub,
            ip: req.ip,
            timestamp: new Date(),
          });
        },

        [CrudOperation.Update]: async (entity: any, req: CrudRequest) => {
          await logAudit({
            action: 'UPDATE',
            resourceType: entity.constructor?.name || 'Unknown',
            resourceId: entity.id,
            userId: req.user?.id || req.user?.sub,
            ip: req.ip,
            timestamp: new Date(),
          });
        },

        [CrudOperation.Delete]: async (entity: any, req: CrudRequest) => {
          await logAudit({
            action: 'DELETE',
            resourceType: entity.constructor?.name || 'Unknown',
            resourceId: entity.id,
            userId: req.user?.id || req.user?.sub,
            ip: req.ip,
            timestamp: new Date(),
          });
        },
      },
    };
  },
};

/**
 * 감사 로그 기록 헬퍼 함수
 *
 * 실제 구현에서는 Prisma를 사용하여 audit_logs 테이블에 저장합니다.
 *
 * @param data 감사 로그 데이터
 */
async function logAudit(data: {
  action: string;
  resourceType: string;
  resourceId: string;
  userId?: string;
  ip?: string;
  timestamp: Date;
}): Promise<void> {
  // TODO: Prisma로 audit_logs 테이블에 저장
  // await prisma.auditLog.create({ data });

  // 개발 환경: 콘솔 출력
  if (process.env.NODE_ENV !== 'production') {
    console.log('[AuditLog]', {
      action: data.action,
      resource: `${data.resourceType}:${data.resourceId}`,
      user: data.userId || 'anonymous',
      ip: data.ip,
      timestamp: data.timestamp.toISOString(),
    });
  }
}
