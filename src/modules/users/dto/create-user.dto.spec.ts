import { validate } from 'class-validator';
import { CreateUserDto } from './create-user.dto';

describe('CreateUserDto', () => {
  it('should be defined', () => {
    const dto = new CreateUserDto();
    expect(dto).toBeDefined();
  });

  it('should validate valid data', async () => {
    const dto = new CreateUserDto();
    dto.name = 'Test User';
    dto.email = 'test@example.com';
    dto.password = 'password123';

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should reject invalid email', async () => {
    const dto = new CreateUserDto();
    dto.name = 'Test User';
    dto.email = 'invalid-email';
    dto.password = 'password123';

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });
});
