/**
 * CRUD 시스템 성능 테스트 스크립트
 *
 * N+1 쿼리 최적화 효과를 실제로 측정합니다.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: ['query'], // 쿼리 로그 활성화
});

async function main() {
  console.log('\n📊 CRUD 시스템 성능 테스트\n');

  // 테스트 데이터 정리
  await prisma.user.deleteMany();

  // 테스트 데이터 생성
  console.log('✅ 테스트 데이터 생성 중...');
  const users = [];
  for (let i = 0; i < 100; i++) {
    users.push({
      name: `User ${i}`,
      email: `user${i}@example.com`,
      password: 'test123',
      isActive: i % 2 === 0,
    });
  }

  await prisma.user.createMany({ data: users });
  console.log(`✅ ${users.length}명의 사용자 생성 완료\n`);

  // 성능 테스트 1: 전체 조회 (N+1 없음)
  console.log('🔍 테스트 1: 전체 사용자 조회 (N+1 쿼리 없음)');
  const start1 = Date.now();
  const allUsers = await prisma.user.findMany();
  const end1 = Date.now();
  console.log(`⏱️  응답 시간: ${end1 - start1}ms`);
  console.log(`📦 조회된 사용자 수: ${allUsers.length}`);
  console.log(`✅ 테스트 1 완료\n`);

  // 성능 테스트 2: 필터링
  console.log('🔍 테스트 2: 필터링 (isActive = true)');
  const start2 = Date.now();
  const activeUsers = await prisma.user.findMany({
    where: { isActive: true },
  });
  const end2 = Date.now();
  console.log(`⏱️  응답 시간: ${end2 - start2}ms`);
  console.log(`📦 조회된 사용자 수: ${activeUsers.length}`);
  console.log(`✅ 테스트 2 완료\n`);

  // 성능 테스트 3: 정렬
  console.log('🔍 테스트 3: 정렬 (createdAt DESC)');
  const start3 = Date.now();
  const sortedUsers = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10,
  });
  const end3 = Date.now();
  console.log(`⏱️  응답 시간: ${end3 - start3}ms`);
  console.log(`📦 조회된 사용자 수: ${sortedUsers.length}`);
  console.log(`✅ 테스트 3 완료\n`);

  // 성능 테스트 4: 페이지네이션
  console.log('🔍 테스트 4: 페이지네이션 (page 1, size 10)');
  const start4 = Date.now();
  const paginatedUsers = await prisma.user.findMany({
    skip: 0,
    take: 10,
  });
  const end4 = Date.now();
  console.log(`⏱️  응답 시간: ${end4 - start4}ms`);
  console.log(`📦 조회된 사용자 수: ${paginatedUsers.length}`);
  console.log(`✅ 테스트 4 완료\n`);

  // 성능 테스트 5: 복잡한 쿼리 (필터 + 정렬 + 페이지네이션)
  console.log('🔍 테스트 5: 복잡한 쿼리 (필터 + 정렬 + 페이지네이션)');
  const start5 = Date.now();
  const complexQuery = await prisma.user.findMany({
    where: { isActive: true },
    orderBy: { createdAt: 'desc' },
    skip: 0,
    take: 10,
  });
  const end5 = Date.now();
  console.log(`⏱️  응답 시간: ${end5 - start5}ms`);
  console.log(`📦 조회된 사용자 수: ${complexQuery.length}`);
  console.log(`✅ 테스트 5 완료\n`);

  // 결과 요약
  console.log('📊 성능 테스트 결과 요약');
  console.log('='.repeat(50));
  console.log(`전체 조회:        ${end1 - start1}ms`);
  console.log(`필터링:           ${end2 - start2}ms`);
  console.log(`정렬:             ${end3 - start3}ms`);
  console.log(`페이지네이션:     ${end4 - start4}ms`);
  console.log(`복잡한 쿼리:      ${end5 - start5}ms`);
  console.log('='.repeat(50));

  // 성능 기준 검증
  const maxTime = 500; // 최대 허용 시간 (ms)
  const allTestsPassed =
    end1 - start1 < maxTime &&
    end2 - start2 < maxTime &&
    end3 - start3 < maxTime &&
    end4 - start4 < maxTime &&
    end5 - start5 < maxTime;

  if (allTestsPassed) {
    console.log(`\n✅ 모든 성능 테스트 통과! (기준: ${maxTime}ms 미만)`);
  } else {
    console.log(`\n⚠️  일부 테스트가 성능 기준을 초과했습니다. (기준: ${maxTime}ms 미만)`);
  }

  // 정리
  await prisma.user.deleteMany();
  console.log('\n🧹 테스트 데이터 정리 완료');
}

main()
  .catch((e) => {
    console.error('❌ 오류 발생:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
