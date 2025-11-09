import { Test, TestingModule } from '@nestjs/testing';
import { PrismaModule } from './prisma.module';

describe('PrismaModule', () => {
  it('should compile the module', async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [PrismaModule],
    }).compile();

    expect(module).toBeDefined();
  });
});
