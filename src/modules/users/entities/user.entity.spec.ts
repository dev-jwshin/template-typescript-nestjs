import { User } from './user.entity';

describe('User Entity', () => {
  it('should be defined', () => {
    const user = new User();
    expect(user).toBeDefined();
  });

  it('should have expected properties', () => {
    const user = new User();
    user.id = '1';
    user.name = 'Test';
    user.email = 'test@test.com';

    expect(user.id).toBe('1');
    expect(user.name).toBe('Test');
    expect(user.email).toBe('test@test.com');
  });
});
