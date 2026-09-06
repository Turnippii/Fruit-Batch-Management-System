import type { LotStatus } from '../mocks/lots';
import type { Role } from '../services/auth';

/** at_garden/in_transit: currentHolderId là chủ vườn. Các trạng thái còn lại: currentHolderId là đại lý. */
export function getHolderRole(status: LotStatus): Role {
  return status === 'at_garden' || status === 'in_transit' ? 'grower' : 'retailer';
}

export type ScanOutcome = 'receivable' | 'already_in_stock' | 'held_by_other_retailer' | 'at_garden' | 'unavailable';

/**
 * Phân loại một lô vừa quét được ở màn hình đại lý, dựa trên status + currentHolderId
 * hiện tại — quyết định hiển thị nút "Nhận lô" hay thông báo lỗi nào.
 * - at_garden: chưa xuất kho, chưa thể nhận.
 * - in_transit: currentHolderId vẫn là chủ vườn (chưa gán đại lý cụ thể lúc xuất kho)
 *   nên BẤT KỲ đại lý nào quét được cũng nhận được — receivable.
 * - in_stock: currentHolderId đã là một đại lý cụ thể — so với uid đang đăng nhập để
 *   phân biệt "đã nhận rồi" (quét lại) và "đang thuộc đại lý khác".
 * - sold/discarded: đã rời khỏi vòng theo dõi, không còn nhận được nữa.
 */
export function getScanOutcome(lot: { status: LotStatus; currentHolderId: string }, retailerId: string): ScanOutcome {
  if (lot.status === 'at_garden') return 'at_garden';
  if (lot.status === 'in_transit') return 'receivable';
  if (lot.status === 'in_stock') {
    return lot.currentHolderId === retailerId ? 'already_in_stock' : 'held_by_other_retailer';
  }
  return 'unavailable';
}
