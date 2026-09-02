/**
 * Đúng lúc đổi tài khoản, một listener Firebase mở dưới auth token cũ có thể bị
 * server từ chối (permission_denied) trong khoảnh khắc trước khi effect kịp huỷ
 * và mở lại listener mới dưới token hiện tại. Coi lỗi này là thoáng qua/đang tải,
 * không phải lỗi thật cần hiển thị — nếu KHÔNG tự khỏi (rules sai thật) thì màn
 * hình sẽ đứng ở trạng thái loading thay vì báo lỗi, đây là đánh đổi có chủ đích.
 */
export function isPermissionDeniedError(error: Error): boolean {
  const code = (error as { code?: string }).code;
  if (code && /permission_denied/i.test(code)) return true;
  return /permission[_ ]denied/i.test(error.message);
}
