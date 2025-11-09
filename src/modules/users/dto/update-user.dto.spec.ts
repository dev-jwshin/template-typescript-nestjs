import { UpdateUserDto } from './update-user.dto';

describe('UpdateUserDto', () => {
  it('should be defined', () => {
    const dto = new UpdateUserDto();
    expect(dto).toBeDefined();
  });

  it('should accept partial data', () => {
    const dto = new UpdateUserDto();
    dto.name = 'Updated Name';
    expect(dto.name).toBe('Updated Name');
  });
});
