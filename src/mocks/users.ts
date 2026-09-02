import type { Role } from '../services/auth';

// Chỉ dùng khi USE_MOCK = true (src/config.ts) — không có Firebase Auth thật
// phía sau nên đăng nhập chỉ so khớp email với danh sách cố định này.
export interface MockUser {
  email: string;
  name: string;
  orgName: string;
  role: Role;
}

export const mockUsers: MockUser[] = [
  { email: 'grower@fruittrace.dev', name: 'Chủ vườn', orgName: 'Vườn Xoài Cát Hòa Lộc', role: 'grower' },
  { email: 'retailer@fruittrace.dev', name: 'Nhân viên đại lý', orgName: 'Kho đại lý Bình Thạnh', role: 'retailer' },
];
