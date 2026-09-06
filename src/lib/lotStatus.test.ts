import { canTransition } from './lotStatus';
import type { LotStatus } from '../mocks/lots';

describe('canTransition', () => {
  it('grower được phép xuất kho: at_garden -> in_transit', () => {
    expect(canTransition('at_garden', 'in_transit', 'grower')).toBe(true);
  });

  it('retailer KHÔNG được xuất kho thay chủ vườn', () => {
    expect(canTransition('at_garden', 'in_transit', 'retailer')).toBe(false);
  });

  it('retailer được phép nhận hàng: in_transit -> in_stock', () => {
    expect(canTransition('in_transit', 'in_stock', 'retailer')).toBe(true);
  });

  it('grower KHÔNG được tự nhận hàng thay đại lý', () => {
    expect(canTransition('in_transit', 'in_stock', 'grower')).toBe(false);
  });

  it('retailer được phép đánh dấu đã bán: in_stock -> sold', () => {
    expect(canTransition('in_stock', 'sold', 'retailer')).toBe(true);
  });

  it('grower KHÔNG được đánh dấu đã bán', () => {
    expect(canTransition('in_stock', 'sold', 'grower')).toBe(false);
  });

  it('không cho nhảy cóc bỏ qua bước trung gian', () => {
    expect(canTransition('at_garden', 'in_stock', 'grower')).toBe(false);
    expect(canTransition('at_garden', 'in_stock', 'retailer')).toBe(false);
    expect(canTransition('at_garden', 'sold', 'grower')).toBe(false);
    expect(canTransition('in_transit', 'sold', 'retailer')).toBe(false);
  });

  it('không cho lùi lại trạng thái trước', () => {
    expect(canTransition('in_transit', 'at_garden', 'grower')).toBe(false);
    expect(canTransition('in_stock', 'in_transit', 'retailer')).toBe(false);
    expect(canTransition('sold', 'in_stock', 'retailer')).toBe(false);
  });

  it('không cho "chuyển" về đúng trạng thái hiện tại', () => {
    expect(canTransition('at_garden', 'at_garden', 'grower')).toBe(false);
    expect(canTransition('in_stock', 'in_stock', 'retailer')).toBe(false);
  });

  it('sold là trạng thái cuối của chuỗi chính, không cho đi tiếp', () => {
    expect(canTransition('sold', 'at_garden', 'grower')).toBe(false);
    expect(canTransition('sold', 'in_transit', 'retailer')).toBe(false);
  });

  it('"discarded" chưa có luật chuyển — luôn false dù ở from hay to, bất kể role', () => {
    const roles: Array<'grower' | 'retailer'> = ['grower', 'retailer'];
    const statuses: LotStatus[] = ['at_garden', 'in_transit', 'in_stock', 'sold'];
    for (const role of roles) {
      expect(canTransition('discarded', 'in_transit', role)).toBe(false);
      for (const status of statuses) {
        expect(canTransition(status, 'discarded', role)).toBe(false);
      }
    }
  });
});
