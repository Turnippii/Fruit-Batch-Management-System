/**
 * true  = dùng dữ liệu giả trong src/mocks/ — không cần mạng/Firebase, dùng để
 *         test UI hoặc demo dự phòng khi mất mạng.
 * false = dùng Firebase Realtime Database thật qua src/services/.
 *
 * Đổi tay khi cần — không đọc từ .env vì đây là quyết định lúc build/demo,
 * không phải bí mật cần giấu.
 */
export const USE_MOCK = false;
