import type { LotStatus } from '../mocks/lots';
import type { Role } from '../services/auth';

/** at_garden/in_transit: currentHolderId là chủ vườn. Các trạng thái còn lại: currentHolderId là đại lý. */
export function getHolderRole(status: LotStatus): Role {
  return status === 'at_garden' || status === 'in_transit' ? 'grower' : 'retailer';
}
