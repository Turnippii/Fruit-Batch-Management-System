// Loại bỏ 0/O và 1/I khỏi bảng ký tự SINH mã — hai cặp này quá giống nhau khi in
// nhỏ lên tem hoặc đọc bằng mắt, dễ gây nhầm lẫn lúc nhập tay/đối chiếu thủ công.
// CHỈ áp dụng cho generateLotCode; isValidLotCode KHÔNG được dùng chung bảng này
// (xem comment ở đó) — sinh thì chặt, chấp nhận thì rộng.
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const LOT_CODE_PATTERN = /^FC-\d{4}-[A-Z0-9]{6}$/;

export function generateLotCode(now: Date = new Date()): string {
  let suffix = '';
  for (let i = 0; i < 6; i += 1) {
    suffix += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return `FC-${now.getFullYear()}-${suffix}`;
}

/** Chuẩn hoá chuỗi quét được trước khi so khớp/tra Firebase — nhiều trang tạo QR
 * chèn thêm khoảng trắng hoặc ký tự xuống dòng ở cuối, và không phân biệt hoa/thường
 * dù CODE_CHARS chỉ sinh chữ hoa. */
export function normalizeLotCode(code: string): string {
  return code.trim().toUpperCase();
}

/** Kiểm tra đúng định dạng FC-YYYY-XXXXXX sau khi đã chuẩn hoá — chặn sớm mã QR
 * rác/ngoài hệ thống mà không cần gọi mạng.
 *
 * CỐ Ý chấp nhận đầy đủ A-Z0-9 (kể cả 0/O/1/I), KHÔNG dùng chung CODE_CHARS với
 * generateLotCode: mã hợp lệ có thể đến từ nguồn khác generateLotCode sinh ra
 * (firebase-seed.json, hệ thống cũ, gõ tay) — chỉ cấu trúc mã mới thuộc về
 * isValidLotCode, còn "ký tự nào được dùng để SINH mã mới" là quyết định riêng
 * của generateLotCode. Từng bị bug: dùng chung CODE_CHARS khiến mã hợp lệ như
 * FC-2026-F1H60Y (chứa 1 và 0) bị từ chối. */
export function isValidLotCode(code: string): boolean {
  return LOT_CODE_PATTERN.test(normalizeLotCode(code));
}
