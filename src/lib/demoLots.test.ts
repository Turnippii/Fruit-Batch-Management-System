import { buildDemoLots, harvestDateForTargetRatio, DEMO_FRUIT_TYPE, DEMO_RIPENESS, DEMO_STORAGE_TYPE } from './demoLots';
import { getRemainingRatio, getStatusColor, getStageConsumedRatio } from './shelfLife';
import type { AppConfig } from '../services/config';

const config: AppConfig = {
  shelfLifeBase: { Chuoi: 6, Xoai: 9 },
  ripenessFactor: { Chuoi_chin_toi: 1, Xoai_chin_toi: 1 },
  ripenessSupported: ['Chuoi', 'Xoai'],
  assumedTemp: { at_garden_normal: 30, at_garden_cold: 15, in_transit: 32, in_transit_cold: 18 },
};

describe('harvestDateForTargetRatio', () => {
  it('lùi đúng số ngày để công thức tiêu hao ra đúng targetConsumedRatio', () => {
    const now = new Date('2026-09-06T00:00:00.000Z');
    const initialShelfDays = 6;
    const tempC = 30;
    const target = 0.5;
    const harvestDate = harvestDateForTargetRatio(target, initialShelfDays, tempC, now);
    const recomputed = getStageConsumedRatio(harvestDate, now, tempC, initialShelfDays);
    expect(recomputed).toBeCloseTo(target, 6);
  });

  it('không hardcode: đổi tempC hoặc initialShelfDays thì harvestDate đổi theo', () => {
    const now = new Date('2026-09-06T00:00:00.000Z');
    const a = harvestDateForTargetRatio(0.5, 6, 30, now);
    const b = harvestDateForTargetRatio(0.5, 9, 30, now);
    const c = harvestDateForTargetRatio(0.5, 6, 15, now);
    expect(a.getTime()).not.toBe(b.getTime());
    expect(a.getTime()).not.toBe(c.getTime());
  });
});

describe('buildDemoLots', () => {
  const now = new Date('2026-09-06T00:00:00.000Z');
  const lots = buildDemoLots(config, 'retailer-uid-1', now);

  it('sinh đúng 3 lô', () => {
    expect(lots).toHaveLength(3);
  });

  it('cùng loại quả, cùng độ chín, cùng kho thường — chỉ khác harvestDate', () => {
    for (const lot of lots) {
      expect(lot.fruitType).toBe(DEMO_FRUIT_TYPE);
      expect(lot.ripeness).toBe(DEMO_RIPENESS);
      expect(lot.storageType).toBe(DEMO_STORAGE_TYPE);
    }
    const harvestDates = new Set(lots.map((lot) => lot.harvestDate));
    expect(harvestDates.size).toBe(3);
  });

  it('đặt sẵn in_stock, gán currentHolderId cho đại lý đang đăng nhập, đánh dấu isDemo', () => {
    for (const lot of lots) {
      expect(lot.status).toBe('in_stock');
      expect(lot.currentHolderId).toBe('retailer-uid-1');
      expect(lot.isDemo).toBe(true);
    }
  });

  it('ra đúng 3 màu xanh/vàng/đỏ ngay tại thời điểm tạo (consumedRatio đã lưu = ratio hiện tại)', () => {
    const colors = lots.map((lot) => getStatusColor(getRemainingRatio(lot.consumedRatio ?? 0)));
    expect(colors).toEqual(['green', 'yellow', 'red']);
  });

  it('mã lô không trùng nhau', () => {
    const ids = new Set(lots.map((lot) => lot.id));
    expect(ids.size).toBe(3);
  });
});
