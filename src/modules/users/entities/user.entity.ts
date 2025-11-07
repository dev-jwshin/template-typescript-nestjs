import { ApiProperty } from '@nestjs/swagger';

/**
 * 사용자 엔티티
 * - 사용자 데이터 모델 정의
 * - Prisma 모델과 매핑
 */
export class User {
  @ApiProperty({
    description: '사용자 고유 ID (UUID)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    description: '사용자 이름',
    example: 'John Doe',
  })
  name: string;

  @ApiProperty({
    description: '사용자 이메일 (고유값)',
    example: 'john@example.com',
  })
  email: string;

  @ApiProperty({
    description: '활성 상태',
    example: true,
    default: true,
  })
  isActive: boolean;

  @ApiProperty({
    description: '생성 일시',
    example: '2025-01-01T00:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: '수정 일시',
    example: '2025-01-01T00:00:00.000Z',
  })
  updatedAt: Date;

  /**
   * 비밀번호는 응답에서 제외
   * - 보안을 위해 외부로 노출하지 않음
   * - bcrypt로 해싱하여 저장
   */
  password?: string;
}
