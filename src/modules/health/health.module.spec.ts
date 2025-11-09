import { Test, TestingModule } from '@nestjs/testing';
import { HealthModule } from './health.module';
import { PrismaService } from '../../database/prisma.service';

describe('HealthModule', () => {
  it('should compile the module', async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [HealthModule],
    })
      .overrideProvider(PrismaService)
      .useValue({})
      .compile();

    expect(module).toBeDefined();
  });
});
