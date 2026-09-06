import { base64ToUint8Array } from './base64';

describe('base64ToUint8Array', () => {
  it('giải mã đúng chuỗi không cần padding', () => {
    // "Man" -> "TWFu"
    expect(Array.from(base64ToUint8Array('TWFu'))).toEqual([77, 97, 110]);
  });

  it('giải mã đúng khi có 1 dấu = (padding)', () => {
    // "Ma" -> "TWE="
    expect(Array.from(base64ToUint8Array('TWE='))).toEqual([77, 97]);
  });

  it('giải mã đúng khi có 2 dấu == (padding)', () => {
    // "M" -> "TQ=="
    expect(Array.from(base64ToUint8Array('TQ=='))).toEqual([77]);
  });

  it('giải mã đúng chuỗi dài nhiều nhóm 4 ký tự', () => {
    // "Hello, World!" -> "SGVsbG8sIFdvcmxkIQ=="
    const expected = Array.from('Hello, World!').map((c) => c.charCodeAt(0));
    expect(Array.from(base64ToUint8Array('SGVsbG8sIFdvcmxkIQ=='))).toEqual(expected);
  });

  it('chuỗi rỗng trả về mảng rỗng', () => {
    expect(base64ToUint8Array('').length).toBe(0);
  });
});
