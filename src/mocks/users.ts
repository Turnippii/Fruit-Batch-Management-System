import type { Role } from '../services/auth';

// Chỉ dùng khi USE_MOCK = true (src/config.ts) — không có Firebase Auth thật
// phía sau nên đăng nhập chỉ so khớp email với danh sách cố định này. Trùng
// email với 2 tài khoản Firebase Auth thật để bật/tắt USE_MOCK không đổi
// cách đăng nhập — chỉ mật khẩu là bỏ qua (không kiểm tra) ở chế độ mock.
export interface MockUser {
  email: string;
  name: string;
  orgName: string;
  role: Role;
}

export const mockUsers: MockUser[] = [
  { email: 'vuon@test.com', name: 'Chủ vườn', orgName: 'Vườn Xoài Cát Hòa Lộc', role: 'grower' },
  { email: 'daily@test.com', name: 'Nhân viên đại lý', orgName: 'Kho đại lý Bình Thạnh', role: 'retailer' },
];
