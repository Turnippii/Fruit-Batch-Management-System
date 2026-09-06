import { getHolderRole, getScanOutcome } from './lotHolder';
import type { LotStatus } from '../mocks/lots';

describe('getHolderRole', () => {
  it('at_garden và in_transit là chủ vườn', () => {
    expect(getHolderRole('at_garden')).toBe('grower');
    expect(getHolderRole('in_transit')).toBe('grower');
  });

  it('in_stock, sold, discarded là đại lý', () => {
    expect(getHolderRole('in_stock')).toBe('retailer');
    expect(getHolderRole('sold')).toBe('retailer');
    expect(getHolderRole('discarded')).toBe('retailer');
  });
});

describe('getScanOutcome', () => {
  it('at_garden: chưa xuất kho', () => {
    expect(getScanOutcome({ status: 'at_garden', currentHolderId: 'mock-grower' }, 'retailer-1')).toBe('at_garden');
  });

  it('in_transit: receivable dù currentHolderId đang là chủ vườn (chưa gán đại lý)', () => {
    expect(getScanOutcome({ status: 'in_transit', currentHolderId: 'mock-grower' }, 'retailer-1')).toBe('receivable');
  });

  it('in_stock đúng currentHolderId của mình: already_in_stock (quét lại)', () => {
    expect(getScanOutcome({ status: 'in_stock', currentHolderId: 'retailer-1' }, 'retailer-1')).toBe(
      'already_in_stock'
    );
  });

  it('in_stock nhưng currentHolderId là đại lý khác: held_by_other_retailer', () => {
    expect(getScanOutcome({ status: 'in_stock', currentHolderId: 'retailer-2' }, 'retailer-1')).toBe(
      'held_by_other_retailer'
    );
  });

  it.each(['sold', 'discarded'] as LotStatus[])('%s: unavailable', (status) => {
    expect(getScanOutcome({ status, currentHolderId: 'retailer-1' }, 'retailer-1')).toBe('unavailable');
  });
});
