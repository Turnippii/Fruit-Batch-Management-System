import type { LotStatus } from '../mocks/lots';
import type { Role } from '../services/auth';

// Chuỗi trạng thái CHÍNH của một lô — không gồm "discarded" (nhánh riêng, ngoài
// phạm vi hàm này, chưa có luật chuyển).
const STATUS_ORDER: LotStatus[] = ['at_garden', 'in_transit', 'in_stock', 'sold'];

// Vai trò được phép THỰC HIỆN bước chuyển ĐẾN status này — khớp đúng ai đứng ở đầu
// mỗi bước: chủ vườn xuất kho (-> in_transit), đại lý nhận hàng (-> in_stock) và
// đại lý bán ra (-> sold).
const TRANSITION_ROLE: Partial<Record<LotStatus, Role>> = {
  in_transit: 'grower',
  in_stock: 'retailer',
  sold: 'retailer',
};

/**
 * Chỉ cho chuyển đúng MỘT bước liền kề theo chuỗi
 * at_garden → in_transit → in_stock → sold — không nhảy cóc, không lùi lại — và
 * đúng vai trò được phép thực hiện bước đó. "discarded" chưa có luật chuyển ở đây
 * nên mọi transition liên quan đến nó đều trả về false.
 */
export function canTransition(from: LotStatus, to: LotStatus, role: Role): boolean {
  const fromIndex = STATUS_ORDER.indexOf(from);
  const toIndex = STATUS_ORDER.indexOf(to);
  if (fromIndex === -1 || toIndex === -1) return false;
  if (toIndex !== fromIndex + 1) return false;
  return TRANSITION_ROLE[to] === role;
}
