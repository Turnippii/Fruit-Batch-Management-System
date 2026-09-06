import { generateLotCode, isValidLotCode, normalizeLotCode } from './lotCode';

describe('generateLotCode', () => {
  it('sinh mã đúng định dạng FC-YYYY-XXXXXX, tự kiểm tra được bằng isValidLotCode', () => {
    const code = generateLotCode(new Date('2026-09-06T00:00:00.000Z'));
    expect(code.startsWith('FC-2026-')).toBe(true);
    expect(isValidLotCode(code)).toBe(true);
  });

  it('không bao giờ sinh ra 0, O, 1, I (dễ nhầm khi in tem/đọc bằng mắt) dù isValidLotCode chấp nhận chúng', () => {
    for (let i = 0; i < 200; i += 1) {
      const code = generateLotCode();
      const suffix = code.slice('FC-YYYY-'.length);
      expect(suffix).not.toMatch(/[01OI]/);
    }
  });
});

describe('isValidLotCode', () => {
  it('chấp nhận đúng định dạng FC-YYYY-XXXXXX', () => {
    expect(isValidLotCode('FC-2026-A7X92K')).toBe(true);
  });

  it('từ chối thiếu số/thừa số ở phần năm hoặc mã', () => {
    expect(isValidLotCode('FC-26-A7X92K')).toBe(false);
    expect(isValidLotCode('FC-2026-A7X92')).toBe(false);
    expect(isValidLotCode('FC-2026-A7X92KK')).toBe(false);
  });

  it('chấp nhận đầy đủ A-Z0-9, kể cả 0/O/1/I mà generateLotCode không bao giờ sinh ra — mã hợp lệ có thể đến từ nguồn khác (seed, hệ thống cũ, gõ tay)', () => {
    expect(isValidLotCode('FC-2026-A7XI2K')).toBe(true);
    expect(isValidLotCode('FC-2026-A7XO2K')).toBe(true);
    expect(isValidLotCode('FC-2026-A7X02K')).toBe(true);
    expect(isValidLotCode('FC-2026-A7X12K')).toBe(true);
    expect(isValidLotCode('FC-2026-F1H60Y')).toBe(true);
  });

  it('từ chối chuỗi rác không liên quan', () => {
    expect(isValidLotCode('https://example.com')).toBe(false);
    expect(isValidLotCode('')).toBe(false);
  });

  it('chấp nhận khi có khoảng trắng/xuống dòng thừa ở đầu-cuối (trang tạo QR hay chèn)', () => {
    expect(isValidLotCode('  FC-2026-A7X92K\n')).toBe(true);
    expect(isValidLotCode('\nFC-2026-A7X92K  ')).toBe(true);
  });

  it('chấp nhận chữ thường, không phân biệt hoa/thường', () => {
    expect(isValidLotCode('fc-2026-a7x92k')).toBe(true);
  });
});

describe('normalizeLotCode', () => {
  it('trim khoảng trắng/xuống dòng và chuyển về chữ hoa', () => {
    expect(normalizeLotCode('  fc-2026-a7x92k\n')).toBe('FC-2026-A7X92K');
  });
});
