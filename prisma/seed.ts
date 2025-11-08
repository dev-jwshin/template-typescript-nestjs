import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // 1. 사용자 생성
  const users = await Promise.all([
    prisma.user.upsert({
      where: { email: 'admin@example.com' },
      update: {},
      create: {
        name: 'Admin User',
        email: 'admin@example.com',
        password: '$2b$10$abcdefghijklmnopqrstuvwxyz', // 해시된 비밀번호
        age: 30,
        role: 'admin',
        isActive: true,
      },
    }),
    prisma.user.upsert({
      where: { email: 'john@example.com' },
      update: {},
      create: {
        name: 'John Doe',
        email: 'john@example.com',
        password: '$2b$10$abcdefghijklmnopqrstuvwxyz',
        age: 25,
        role: 'user',
        isActive: true,
      },
    }),
    prisma.user.upsert({
      where: { email: 'jane@example.com' },
      update: {},
      create: {
        name: 'Jane Smith',
        email: 'jane@example.com',
        password: '$2b$10$abcdefghijklmnopqrstuvwxyz',
        age: 28,
        role: 'user',
        isActive: true,
      },
    }),
  ]);

  console.log(`✅ Created ${users.length} users`);

  // 2. 프로필 생성
  const profiles = await Promise.all([
    prisma.profile.upsert({
      where: { userId: users[0].id },
      update: {},
      create: {
        userId: users[0].id,
        bio: 'System administrator with 10 years of experience',
        avatar: 'https://i.pravatar.cc/150?img=1',
        phone: '+82-10-1234-5678',
      },
    }),
    prisma.profile.upsert({
      where: { userId: users[1].id },
      update: {},
      create: {
        userId: users[1].id,
        bio: 'Full-stack developer passionate about TypeScript and NestJS',
        avatar: 'https://i.pravatar.cc/150?img=2',
        phone: '+82-10-2345-6789',
      },
    }),
    prisma.profile.upsert({
      where: { userId: users[2].id },
      update: {},
      create: {
        userId: users[2].id,
        bio: 'Frontend specialist with expertise in React and Vue',
        avatar: 'https://i.pravatar.cc/150?img=3',
        phone: '+82-10-3456-7890',
      },
    }),
  ]);

  console.log(`✅ Created ${profiles.length} profiles`);

  // 3. 포스트 생성
  const posts = await Promise.all([
    prisma.post.upsert({
      where: { slug: 'introduction-to-nestjs' },
      update: {},
      create: {
        title: 'Introduction to NestJS',
        slug: 'introduction-to-nestjs',
        content:
          'NestJS is a progressive Node.js framework for building efficient, reliable and scalable server-side applications.',
        excerpt:
          'Learn the basics of NestJS framework and why it is great for enterprise applications.',
        authorId: users[1].id,
        published: true,
        featured: true,
        viewCount: 1250,
        tags: ['nestjs', 'typescript', 'backend'],
      },
    }),
    prisma.post.upsert({
      where: { slug: 'building-crud-with-decorators' },
      update: {},
      create: {
        title: 'Building CRUD APIs with Decorators',
        slug: 'building-crud-with-decorators',
        content:
          'This article explores how to build powerful CRUD APIs using TypeScript decorators and NestJS.',
        excerpt:
          'Discover the power of decorators for building maintainable APIs.',
        authorId: users[1].id,
        published: true,
        featured: false,
        viewCount: 850,
        tags: ['crud', 'decorators', 'api'],
      },
    }),
    prisma.post.upsert({
      where: { slug: 'mastering-typescript' },
      update: {},
      create: {
        title: 'Mastering TypeScript in 2025',
        slug: 'mastering-typescript',
        content:
          'TypeScript has become the de-facto standard for large-scale JavaScript applications. This guide covers advanced TypeScript patterns.',
        excerpt: 'Advanced TypeScript patterns and best practices for 2025.',
        authorId: users[2].id,
        published: true,
        featured: true,
        viewCount: 2100,
        tags: ['typescript', 'javascript', 'programming'],
      },
    }),
    prisma.post.upsert({
      where: { slug: 'react-performance-tips' },
      update: {},
      create: {
        title: 'React Performance Optimization Tips',
        slug: 'react-performance-tips',
        content:
          'Learn how to optimize your React applications for better performance and user experience.',
        excerpt: 'Proven techniques to make your React apps faster.',
        authorId: users[2].id,
        published: true,
        featured: false,
        viewCount: 1500,
        tags: ['react', 'performance', 'optimization'],
      },
    }),
    prisma.post.upsert({
      where: { slug: 'draft-upcoming-features' },
      update: {},
      create: {
        title: 'Upcoming Features in Our Platform',
        slug: 'draft-upcoming-features',
        content: 'This is a draft post about upcoming features. Stay tuned!',
        excerpt: 'Preview of exciting features coming soon.',
        authorId: users[0].id,
        published: false,
        featured: false,
        viewCount: 0,
        tags: ['announcement', 'features'],
      },
    }),
  ]);

  console.log(`✅ Created ${posts.length} posts`);

  // 4. 통계 출력
  const totalUsers = await prisma.user.count();
  const totalProfiles = await prisma.profile.count();
  const totalPosts = await prisma.post.count();
  const publishedPosts = await prisma.post.count({
    where: { published: true },
  });

  console.log('\n📊 Database Statistics:');
  console.log(`   Users: ${totalUsers}`);
  console.log(`   Profiles: ${totalProfiles}`);
  console.log(`   Posts: ${totalPosts} (${publishedPosts} published)`);
  console.log('\n✨ Seeding completed successfully!\n');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
