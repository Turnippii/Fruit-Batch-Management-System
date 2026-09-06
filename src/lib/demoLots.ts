import type { AppConfig } from '../services/config';
import type { Lot } from '../mocks/lots';
import { generateLotCode } from './lotCode';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// Cả 3 lô mẫu cùng loại/độ chín/kho thường — CHỈ khác harvestDate lùi, đúng yêu
// cầu demo ("chỉ khác harvestDate lùi để ra đúng 3 màu").
export const DEMO_FRUIT_TYPE = 'Chuoi';
export const DEMO_RIPENESS = 'Chuoi_chin_toi';
export const DEMO_STORAGE_TYPE = 'thuong';

interface DemoLotSpec {
  color: 'green' | 'yellow' | 'red';
  /** Nằm sâu trong khoảng màu tương ứng (không sát ngưỡng) để chịu được một ít
   * drift tự nhiên trước khi demo kịp bật nén thời gian. */
  targetRemainingRatio: number;
  gardenName: string;
}

const DEMO_LOT_SPECS: DemoLotSpec[] = [
  { color: 'green', targetRemainingRatio: 0.75, gardenName: 'Vườn Chuối Demo (Xanh)' },
  { color: 'yellow', targetRemainingRatio: 0.35, gardenName: 'Vườn Chuối Demo (Vàng)' },
  { color: 'red', targetRemainingRatio: 0.1, gardenName: 'Vườn Chuối Demo (Đỏ)' },
];

/**
 * Tính NGƯỢC harvestDate: nếu lô hao mòn liên tục dưới nhiệt độ giả định `tempC`
 * kể từ đó tới `now`, sẽ đạt đúng `targetConsumedRatio`. Đảo ngược công thức tiêu
 * hao (dt/24)*2^((T-25)/10)/initialShelfDays — ĐỪNG hardcode số ngày lùi, vì
 * initialShelfDays và tempC đều đọc từ config, có thể đổi.
 */
export function harvestDateForTargetRatio(
  targetConsumedRatio: number,
  initialShelfDays: number,
  tempC: number,
  now: Date
): Date {
  const factor = Math.pow(2, (tempC - 25) / 10);
  const elapsedDays = (targetConsumedRatio * initialShelfDays) / factor;
  return new Date(now.getTime() - elapsedDays * MS_PER_DAY);
}

/**
 * Sinh 3 lô chuối demo — status thẳng "in_stock" (bỏ qua at_garden/in_transit) với
 * currentHolderId = đại lý đang đăng nhập, để hiện ngay trên màn kho. consumedRatio
 * ghi thẳng giá trị mục tiêu (đóng vai "đã đo được lúc nhận"), updatedAt = now, nên
 * resolveConsumedRatio (nhánh in_stock) cộng dồn tiếp bình thường từ đây — kể cả
 * dưới nhiệt độ nén thời gian ở màn hiển thị.
 */
export function buildDemoLots(config: AppConfig, retailerId: string, now: Date = new Date()): Lot[] {
  const initialShelfDays = Math.round(
    (config.shelfLifeBase[DEMO_FRUIT_TYPE] ?? 6) * (config.ripenessFactor[DEMO_RIPENESS] ?? 1)
  );
  const tempC = config.assumedTemp.at_garden_normal; // storageType 'thuong' -> nhiệt độ thường

  return DEMO_LOT_SPECS.map((spec) => {
    const consumedRatio = 1 - spec.targetRemainingRatio;
    const harvestDate = harvestDateForTargetRatio(consumedRatio, initialShelfDays, tempC, now);
    const id = generateLotCode(now);
    const nowIso = now.toISOString();
    return {
      id,
      fruitType: DEMO_FRUIT_TYPE,
      ripeness: DEMO_RIPENESS,
      harvestDate: harvestDate.toISOString(),
      quantity: 50,
      unit: 'kg',
      storageType: DEMO_STORAGE_TYPE,
      gardenName: spec.gardenName,
      initialShelfDays,
      consumedRatio,
      updatedAt: nowIso,
      status: 'in_stock',
      growerId: 'demo-grower',
      currentHolderId: retailerId,
      createdAt: nowIso,
      isDemo: true,
      history: [
        {
          event: 'harvested',
          timestamp: harvestDate.toISOString(),
          actorId: 'demo-grower',
          note: 'Thu hoạch (lô mẫu demo)',
        },
        {
          event: 'in_stock',
          timestamp: nowIso,
          actorId: retailerId,
          note: 'Lô mẫu demo — tạo sẵn để trình diễn',
        },
      ],
    };
  });
}
