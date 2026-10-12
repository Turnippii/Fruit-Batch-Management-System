import { buildLotAlerts } from './lotAlerts';
import type { Lot } from '../mocks/lots';

const assumedTemp = { at_garden_normal: 30, at_garden_cold: 15, in_transit: 32, in_transit_cold: 18 };
const now = new Date('2026-09-06T00:00:00.000Z');

function makeLot(overrides: Partial<Lot>): Lot {
  return {
    id: 'FC-2026-AAAAAA',
    fruitType: 'Chuoi',
    ripeness: 'Chuoi_chin_toi',
    harvestDate: '2026-09-01',
    quantity: 10,
    unit: 'kg',
    storageType: 'thuong',
    gardenName: 'Vườn A',
    initialShelfDays: 10,
    consumedRatio: 0.1,
    updatedAt: now.toISOString(),
    status: 'in_stock',
    growerId: 'grower-1',
    currentHolderId: 'retailer-1',
    createdAt: '2026-09-01T00:00:00.000Z',
    history: [],
    ...overrides,
  };
}

describe('buildLotAlerts', () => {
  const retailerOpts = { role: 'retailer' as const, uid: 'retailer-1', assumedTemp, stationTemp: undefined, now };
  const growerOpts = { role: 'grower' as const, uid: 'grower-1', assumedTemp, stationTemp: undefined, now };

  it('chỉ giữ lô vàng/đỏ, bỏ lô xanh', () => {
    const lots = [
      makeLot({ id: 'G', consumedRatio: 0.1 }),
      makeLot({ id: 'Y', consumedRatio: 0.6 }),
      makeLot({ id: 'R', consumedRatio: 0.9 }),
    ];
    const alerts = buildLotAlerts(lots, retailerOpts);
    expect(alerts.map((a) => [a.lot.id, a.level])).toEqual([
      ['R', 'red'],
      ['Y', 'yellow'],
    ]);
  });

  it('đại lý: chỉ lô in_stock đang giữ', () => {
    const lots = [
      makeLot({ id: 'mine', consumedRatio: 0.9 }),
      makeLot({ id: 'other', consumedRatio: 0.9, currentHolderId: 'retailer-2' }),
      makeLot({ id: 'sold', consumedRatio: 0.9, status: 'sold' }),
    ];
    expect(buildLotAlerts(lots, retailerOpts).map((a) => a.lot.id)).toEqual(['mine']);
  });

  it('chủ vườn: lô của mình, bỏ sold/discarded', () => {
    const lots = [
      makeLot({ id: 'stock', consumedRatio: 0.9 }),
      makeLot({ id: 'other', consumedRatio: 0.9, growerId: 'grower-2' }),
      makeLot({ id: 'sold', consumedRatio: 0.9, status: 'sold' }),
      makeLot({ id: 'discarded', consumedRatio: 0.9, status: 'discarded' }),
    ];
    expect(buildLotAlerts(lots, growerOpts).map((a) => a.lot.id)).toEqual(['stock']);
  });

  it('sắp theo số ngày còn lại tăng dần, bằng nhau thì theo harvestDate', () => {
    const lots = [
      makeLot({ id: 'more', consumedRatio: 0.6 }),
      makeLot({ id: 'tie-late', consumedRatio: 0.85, harvestDate: '2026-09-03' }),
      makeLot({ id: 'tie-early', consumedRatio: 0.85, harvestDate: '2026-09-02' }),
    ];
    expect(buildLotAlerts(lots, retailerOpts).map((a) => a.lot.id)).toEqual(['tie-early', 'tie-late', 'more']);
  });

  it('now tiến lên thì lô đổi mức (chế độ nén thời gian)', () => {
    const lot = makeLot({ status: 'at_garden', consumedRatio: null, currentHolderId: 'grower-1', harvestDate: '2026-09-05' });
    expect(buildLotAlerts([lot], growerOpts)).toEqual([]);
    const later = new Date(now.getTime() + 8 * 24 * 3600 * 1000);
    expect(buildLotAlerts([lot], { ...growerOpts, now: later })).toHaveLength(1);
  });
});
