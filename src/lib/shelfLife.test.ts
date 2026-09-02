import {
  getRemainingRatio,
  getRemainingDays,
  getRemainingDaysFloor,
  getStatusColor,
  getExpiryDate,
  getCountdownParts,
  formatCountdown,
  getStageConsumedRatio,
  getConsumedRatioBreakdown,
  getTotalConsumedRatio,
  resolveConsumedRatio,
} from './shelfLife';
import type { AssumedTempConfig } from '../mocks/config';
import type { LotHistoryEntry, LotStatus, StorageTypeCode } from '../mocks/lots';

describe('getRemainingRatio', () => {
  it('trừ consumedRatio khỏi 1', () => {
    expect(getRemainingRatio(0.3)).toBeCloseTo(0.7);
  });

  it('kẹp trong khoảng [0, 1]', () => {
    expect(getRemainingRatio(1.5)).toBe(0);
    expect(getRemainingRatio(-0.5)).toBe(1);
  });
});

describe('getRemainingDays', () => {
  it('nhân remainingRatio với initialShelfDays', () => {
    expect(getRemainingDays(10, 0.4)).toBeCloseTo(6);
  });
});

describe('getRemainingDaysFloor', () => {
  it('luôn làm tròn xuống (Math.floor), không làm tròn gần nhất', () => {
    expect(getRemainingDaysFloor(9, 0.15)).toBe(7); // 9 * 0.85 = 7.65 -> 7, không phải 8
  });

  it('trả về đúng số nguyên khi remainingDays là số nguyên chẵn', () => {
    expect(getRemainingDaysFloor(10, 0.2)).toBe(8); // 10 * 0.8 = 8.0
  });

  it('trả về 0 khi consumedRatio = 1 (đã tiêu hao hết)', () => {
    expect(getRemainingDaysFloor(10, 1)).toBe(0);
  });

  it('trả về 0 khi còn chưa tới 1 ngày', () => {
    expect(getRemainingDaysFloor(10, 0.95)).toBe(0); // 10 * 0.05 = 0.5 -> 0
  });
});

describe('getStatusColor', () => {
  it('green khi remainingRatio > 0.5', () => {
    expect(getStatusColor(0.9)).toBe('green');
    expect(getStatusColor(0.51)).toBe('green');
  });

  it('yellow khi 0.2 < remainingRatio <= 0.5', () => {
    expect(getStatusColor(0.5)).toBe('yellow');
    expect(getStatusColor(0.21)).toBe('yellow');
  });

  it('red khi remainingRatio <= 0.2', () => {
    expect(getStatusColor(0.2)).toBe('red');
    expect(getStatusColor(0)).toBe('red');
  });
});

describe('getExpiryDate', () => {
  it('cộng remainingDays (theo ms) vào mốc from', () => {
    const from = new Date('2026-09-01T00:00:00.000Z');
    const result = getExpiryDate(10, 0.5, from);
    expect(result.toISOString()).toBe('2026-09-06T00:00:00.000Z');
  });
});

describe('getCountdownParts', () => {
  it('tách đúng ngày/giờ/phút/giây còn lại', () => {
    const now = new Date('2026-09-01T00:00:00.000Z');
    const expiry = new Date('2026-09-03T05:04:03.000Z');
    const parts = getCountdownParts(expiry, now);
    expect(parts).toEqual({
      days: 2,
      hours: 5,
      minutes: 4,
      seconds: 3,
      totalMs: expiry.getTime() - now.getTime(),
      isExpired: false,
    });
  });

  it('báo isExpired khi expiryDate đã qua', () => {
    const now = new Date('2026-09-05T00:00:00.000Z');
    const expiry = new Date('2026-09-01T00:00:00.000Z');
    const parts = getCountdownParts(expiry, now);
    expect(parts.isExpired).toBe(true);
    expect(parts.totalMs).toBe(0);
  });
});

describe('formatCountdown', () => {
  it('định dạng "N ngày HH:mm:ss"', () => {
    const parts = getCountdownParts(
      new Date('2026-09-03T05:04:03.000Z'),
      new Date('2026-09-01T00:00:00.000Z')
    );
    expect(formatCountdown(parts)).toBe('2 ngày 05:04:03');
  });

  it('trả về "Đã quá hạn" khi hết hạn', () => {
    const parts = getCountdownParts(
      new Date('2026-09-01T00:00:00.000Z'),
      new Date('2026-09-05T00:00:00.000Z')
    );
    expect(formatCountdown(parts)).toBe('Đã quá hạn');
  });
});

describe('getStageConsumedRatio', () => {
  it('áp dụng công thức (dt/24) * 2^((T-25)/10) / initialShelfDays', () => {
    const from = new Date('2026-09-01T00:00:00.000Z');
    const to = new Date('2026-09-02T00:00:00.000Z'); // 24h = 1 ngày
    // T = 25 => hệ số 2^0 = 1 => tiêu hao đúng 1 ngày / initialShelfDays
    expect(getStageConsumedRatio(from, to, 25, 6)).toBeCloseTo(1 / 6);
  });

  it('nhiệt độ cao hơn 25°C làm tiêu hao nhanh hơn tuyến tính', () => {
    const from = new Date('2026-09-01T00:00:00.000Z');
    const to = new Date('2026-09-02T00:00:00.000Z');
    // T = 35 => hệ số 2^1 = 2
    expect(getStageConsumedRatio(from, to, 35, 6)).toBeCloseTo((1 / 6) * 2);
  });

  it('trả về 0 khi to sớm hơn from (không tiêu hao âm)', () => {
    const from = new Date('2026-09-02T00:00:00.000Z');
    const to = new Date('2026-09-01T00:00:00.000Z');
    expect(getStageConsumedRatio(from, to, 30, 6)).toBe(0);
  });
});

const assumedTempFixture: AssumedTempConfig = {
  at_garden_normal: 30,
  at_garden_cold: 15,
  in_transit: 32,
  in_transit_cold: 18,
};

function historyFixture(events: Array<[string, string]>): LotHistoryEntry[] {
  return events.map(([event, timestamp]) => ({ event, timestamp, actorId: 'tester' }));
}

describe('getConsumedRatioBreakdown', () => {
  it('lô còn tại vườn: chỉ có 1 chặng at_garden, tính từ harvestDate đến now', () => {
    const now = new Date('2026-09-02T01:00:00.000Z');
    const breakdown = getConsumedRatioBreakdown(
      {
        harvestDate: '2026-09-01T01:00:00.000Z',
        storageType: 'thuong' as StorageTypeCode,
        initialShelfDays: 6,
        history: historyFixture([['harvested', '2026-09-01T01:00:00.000Z']]),
      },
      assumedTempFixture,
      undefined,
      now
    );
    expect(breakdown).toHaveLength(1);
    expect(breakdown[0].stage).toBe('at_garden');
    expect(breakdown[0].tempC).toBe(30);
    expect(breakdown[0].isMeasured).toBe(false);
    expect(breakdown[0].consumedRatio).toBeGreaterThan(0);
  });

  it('lô đang vận chuyển: có chặng at_garden (đã đóng) + in_transit (đang chạy đến now)', () => {
    const now = new Date('2026-09-02T08:00:00.000Z');
    const breakdown = getConsumedRatioBreakdown(
      {
        harvestDate: '2026-08-31T02:00:00.000Z',
        storageType: 'thuong' as StorageTypeCode,
        initialShelfDays: 9,
        history: historyFixture([
          ['harvested', '2026-08-31T02:00:00.000Z'],
          ['shipped', '2026-08-31T06:00:00.000Z'],
        ]),
      },
      assumedTempFixture,
      undefined,
      now
    );
    expect(breakdown.map((s) => s.stage)).toEqual(['at_garden', 'in_transit']);
    expect(breakdown[0].to).toEqual(new Date('2026-08-31T06:00:00.000Z'));
    expect(breakdown[1].tempC).toBe(32);
    expect(breakdown[1].to).toEqual(now);
    expect(getTotalConsumedRatio(breakdown)).toBeCloseTo(0.402232, 5);
  });

  it('lô đã vào kho: chặng in_stock dùng nhiệt độ cảm biến thật khi có, isMeasured = true', () => {
    const now = new Date('2026-08-29T10:00:00.000Z');
    const breakdown = getConsumedRatioBreakdown(
      {
        harvestDate: '2026-08-28T02:00:00.000Z',
        storageType: 'lanh' as StorageTypeCode,
        initialShelfDays: 9,
        history: historyFixture([
          ['harvested', '2026-08-28T02:00:00.000Z'],
          ['shipped', '2026-08-28T06:00:00.000Z'],
          ['received', '2026-08-29T01:00:00.000Z'],
        ]),
      },
      assumedTempFixture,
      6.5,
      now
    );
    expect(breakdown.map((s) => s.stage)).toEqual(['at_garden', 'in_transit', 'in_stock']);
    const stockStage = breakdown[2];
    expect(stockStage.tempC).toBe(6.5);
    expect(stockStage.isMeasured).toBe(true);
    expect(breakdown[0].tempC).toBe(15); // kho lạnh tại vườn
    expect(breakdown[1].tempC).toBe(18); // xe lạnh
  });

  it('lô chưa nhận (chưa có event received): không có chặng in_stock', () => {
    const now = new Date('2026-09-01T00:00:00.000Z');
    const breakdown = getConsumedRatioBreakdown(
      {
        harvestDate: '2026-08-31T02:00:00.000Z',
        storageType: 'thuong' as StorageTypeCode,
        initialShelfDays: 9,
        history: historyFixture([
          ['harvested', '2026-08-31T02:00:00.000Z'],
          ['shipped', '2026-08-31T06:00:00.000Z'],
        ]),
      },
      assumedTempFixture,
      6.5,
      now
    );
    expect(breakdown.some((s) => s.stage === 'in_stock')).toBe(false);
  });
});

describe('resolveConsumedRatio', () => {
  it('at_garden: bỏ qua consumedRatio đã lưu, luôn tính lại từ harvestDate', () => {
    const now = new Date('2026-09-02T01:00:00.000Z');
    const lot = {
      status: 'at_garden' as LotStatus,
      consumedRatio: 999, // giá trị lưu sai/cũ — không được đọc
      updatedAt: undefined,
      harvestDate: '2026-09-01T01:00:00.000Z',
      storageType: 'thuong' as StorageTypeCode,
      initialShelfDays: 6,
      history: historyFixture([['harvested', '2026-09-01T01:00:00.000Z']]),
    };
    const result = resolveConsumedRatio(lot, assumedTempFixture, undefined, now);
    expect(result).toBeCloseTo(
      getTotalConsumedRatio(getConsumedRatioBreakdown(lot, assumedTempFixture, undefined, now))
    );
    expect(result).not.toBe(999);
  });

  it('in_transit: bỏ qua consumedRatio đã lưu, cộng dồn chặng at_garden (đã đóng) + in_transit (đang chạy)', () => {
    const now = new Date('2026-09-02T08:00:00.000Z');
    const lot = {
      status: 'in_transit' as LotStatus,
      consumedRatio: null,
      updatedAt: undefined,
      harvestDate: '2026-08-31T02:00:00.000Z',
      storageType: 'thuong' as StorageTypeCode,
      initialShelfDays: 9,
      history: historyFixture([
        ['harvested', '2026-08-31T02:00:00.000Z'],
        ['shipped', '2026-08-31T06:00:00.000Z'],
      ]),
    };
    const result = resolveConsumedRatio(lot, assumedTempFixture, undefined, now);
    expect(result).toBeCloseTo(0.402232, 5);
  });

  it('in_stock: đọc consumedRatio đã lưu, cộng phần trôi từ updatedAt đến now bằng nhiệt độ cảm biến', () => {
    const now = new Date('2026-09-02T08:00:00.000Z');
    const lot = {
      status: 'in_stock' as LotStatus,
      consumedRatio: 0.15,
      updatedAt: '2026-09-01T08:00:00.000Z', // 24h trước now
      harvestDate: '2026-08-28T02:00:00.000Z',
      storageType: 'lanh' as StorageTypeCode,
      initialShelfDays: 9,
      history: historyFixture([
        ['harvested', '2026-08-28T02:00:00.000Z'],
        ['shipped', '2026-08-28T06:00:00.000Z'],
        ['received', '2026-08-29T01:00:00.000Z'],
      ]),
    };
    const stationTempC = 6.5;
    const expectedDrift = getStageConsumedRatio(new Date(lot.updatedAt), now, stationTempC, lot.initialShelfDays);
    const result = resolveConsumedRatio(lot, assumedTempFixture, stationTempC, now);
    expect(result).toBeCloseTo(0.15 + expectedDrift, 10);
    expect(result).toBeGreaterThan(0.15); // phải trôi thêm, không đứng yên
  });

  it('in_stock nhưng thiếu updatedAt hoặc chưa có nhiệt độ cảm biến: trả nguyên giá trị đã lưu, không cộng dồn', () => {
    const now = new Date('2026-09-02T08:00:00.000Z');
    const baseLot = {
      status: 'in_stock' as LotStatus,
      consumedRatio: 0.4,
      harvestDate: '2026-08-28T02:00:00.000Z',
      storageType: 'thuong' as StorageTypeCode,
      initialShelfDays: 9,
      history: historyFixture([['harvested', '2026-08-28T02:00:00.000Z']]),
    };
    expect(resolveConsumedRatio({ ...baseLot, updatedAt: undefined }, assumedTempFixture, 6.5, now)).toBe(0.4);
    expect(
      resolveConsumedRatio({ ...baseLot, updatedAt: '2026-09-01T08:00:00.000Z' }, assumedTempFixture, undefined, now)
    ).toBe(0.4);
  });

  it.each(['sold', 'discarded'] as LotStatus[])(
    '%s: trả nguyên consumedRatio đã lưu, KHÔNG cộng drift theo nhiệt độ kho dù có updatedAt và stationTemp',
    (status) => {
      const now = new Date('2026-09-02T08:00:00.000Z');
      const lot = {
        status,
        consumedRatio: 0.6,
        updatedAt: '2026-09-01T08:00:00.000Z', // 24h trước now — nếu cộng drift sẽ khác 0.6
        harvestDate: '2026-08-20T02:00:00.000Z',
        storageType: 'thuong' as StorageTypeCode,
        initialShelfDays: 21,
        history: historyFixture([['harvested', '2026-08-20T02:00:00.000Z']]),
      };
      expect(resolveConsumedRatio(lot, assumedTempFixture, 29, now)).toBe(0.6);
    }
  );

  it('sold: consumedRatio null (chưa từng ghi) trả về 0, không throw', () => {
    const now = new Date('2026-09-02T08:00:00.000Z');
    const lot = {
      status: 'sold' as LotStatus,
      consumedRatio: null,
      updatedAt: '2026-09-01T08:00:00.000Z',
      harvestDate: '2026-08-20T02:00:00.000Z',
      storageType: 'thuong' as StorageTypeCode,
      initialShelfDays: 21,
      history: historyFixture([['harvested', '2026-08-20T02:00:00.000Z']]),
    };
    expect(resolveConsumedRatio(lot, assumedTempFixture, 29, now)).toBe(0);
  });
});
