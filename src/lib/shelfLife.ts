import type { StatusColorKey } from '../constants/theme';
import type { AssumedTempConfig } from '../mocks/config';
import type { LotHistoryEntry, LotStatus, StorageTypeCode } from '../mocks/lots';

const MS_PER_SECOND = 1000;
const MS_PER_MINUTE = 60 * MS_PER_SECOND;
const MS_PER_HOUR = 60 * MS_PER_MINUTE;
const MS_PER_DAY = 24 * MS_PER_HOUR;

/** consumedRatio is a stored value here — for how it's derived from harvestDate and per-stage temperature, see getConsumedRatioBreakdown below. */
export function getRemainingRatio(consumedRatio: number): number {
  const remaining = 1 - consumedRatio;
  return Math.min(1, Math.max(0, remaining));
}

export function getRemainingDays(initialShelfDays: number, consumedRatio: number): number {
  return getRemainingRatio(consumedRatio) * initialShelfDays;
}

/** Số ngày còn lại hiển thị dạng số nguyên — MỌI màn hình phải gọi hàm này thay vì tự làm tròn, để tránh lệch số giữa các màn (Math.round vs Math.floor). */
export function getRemainingDaysFloor(initialShelfDays: number, consumedRatio: number): number {
  return Math.floor(getRemainingDays(initialShelfDays, consumedRatio));
}

export function getStatusColor(remainingRatio: number): StatusColorKey {
  if (remainingRatio > 0.5) return 'green';
  if (remainingRatio > 0.2) return 'yellow';
  return 'red';
}

export function getExpiryDate(
  initialShelfDays: number,
  consumedRatio: number,
  from: Date = new Date()
): Date {
  const remainingDays = getRemainingDays(initialShelfDays, consumedRatio);
  return new Date(from.getTime() + remainingDays * MS_PER_DAY);
}

export interface CountdownParts {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalMs: number;
  isExpired: boolean;
}

export function getCountdownParts(expiryDate: Date, now: Date = new Date()): CountdownParts {
  const totalMs = expiryDate.getTime() - now.getTime();
  if (totalMs <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, totalMs: 0, isExpired: true };
  }
  const days = Math.floor(totalMs / MS_PER_DAY);
  const hours = Math.floor((totalMs % MS_PER_DAY) / MS_PER_HOUR);
  const minutes = Math.floor((totalMs % MS_PER_HOUR) / MS_PER_MINUTE);
  const seconds = Math.floor((totalMs % MS_PER_MINUTE) / MS_PER_SECOND);
  return { days, hours, minutes, seconds, totalMs, isExpired: false };
}

function pad2(value: number): string {
  return value.toString().padStart(2, '0');
}

export function formatCountdown(parts: CountdownParts): string {
  if (parts.isExpired) return 'Đã quá hạn';
  const time = `${pad2(parts.hours)}:${pad2(parts.minutes)}:${pad2(parts.seconds)}`;
  return `${parts.days} ngày ${time}`;
}

export type ShelfStage = 'at_garden' | 'in_transit' | 'in_stock';

export interface ShelfStageBreakdown {
  stage: ShelfStage;
  from: Date;
  to: Date;
  tempC: number;
  /** true = đọc từ cảm biến trạm IoT thật, false = nhiệt độ giả định theo config/assumedTemp */
  isMeasured: boolean;
  consumedRatio: number;
}

interface LotForConsumedRatio {
  harvestDate: string;
  storageType: StorageTypeCode;
  initialShelfDays: number;
  history: LotHistoryEntry[];
}

function findHistoryTime(history: LotHistoryEntry[], event: string): Date | undefined {
  const entry = history.find((item) => item.event === event);
  return entry ? new Date(entry.timestamp) : undefined;
}

/** Công thức tiêu hao một chặng: (dt tính bằng giờ / 24) * 2^((T-25)/10) / initialShelfDays. */
export function getStageConsumedRatio(from: Date, to: Date, tempC: number, initialShelfDays: number): number {
  if (initialShelfDays <= 0) return 0;
  const dtHours = Math.max(0, (to.getTime() - from.getTime()) / MS_PER_HOUR);
  return (dtHours / 24) * Math.pow(2, (tempC - 25) / 10) / initialShelfDays;
}

/**
 * Chia tiêu hao theo từng chặng vận chuyển, LUÔN bắt đầu tính từ harvestDate — không
 * còn chặng nào coi là "chưa tiêu hao". Chặng tại vườn và vận chuyển dùng nhiệt độ giả
 * định (config/assumedTemp) theo storageType; chặng trong kho đại lý dùng nhiệt độ đo
 * thật từ trạm IoT khi có (isMeasured = true), nếu chưa có thì tạm dùng nhiệt độ giả
 * định tại vườn làm dự phòng.
 */
export function getConsumedRatioBreakdown(
  lot: LotForConsumedRatio,
  assumedTempConfig: AssumedTempConfig,
  stationTempC: number | undefined,
  now: Date = new Date()
): ShelfStageBreakdown[] {
  const stages: ShelfStageBreakdown[] = [];
  const harvestDate = new Date(lot.harvestDate);
  const shippedAt = findHistoryTime(lot.history, 'shipped');
  const receivedAt = findHistoryTime(lot.history, 'received');
  const isCold = lot.storageType === 'lanh';

  const gardenTemp = isCold ? assumedTempConfig.at_garden_cold : assumedTempConfig.at_garden_normal;
  const gardenEnd = shippedAt ?? now;
  stages.push({
    stage: 'at_garden',
    from: harvestDate,
    to: gardenEnd,
    tempC: gardenTemp,
    isMeasured: false,
    consumedRatio: getStageConsumedRatio(harvestDate, gardenEnd, gardenTemp, lot.initialShelfDays),
  });

  if (shippedAt) {
    const transitTemp = isCold ? assumedTempConfig.in_transit_cold : assumedTempConfig.in_transit;
    const transitEnd = receivedAt ?? now;
    stages.push({
      stage: 'in_transit',
      from: shippedAt,
      to: transitEnd,
      tempC: transitTemp,
      isMeasured: false,
      consumedRatio: getStageConsumedRatio(shippedAt, transitEnd, transitTemp, lot.initialShelfDays),
    });
  }

  if (receivedAt) {
    const stockTemp = stationTempC ?? gardenTemp;
    stages.push({
      stage: 'in_stock',
      from: receivedAt,
      to: now,
      tempC: stockTemp,
      isMeasured: stationTempC !== undefined,
      consumedRatio: getStageConsumedRatio(receivedAt, now, stockTemp, lot.initialShelfDays),
    });
  }

  return stages;
}

export function getTotalConsumedRatio(breakdown: ShelfStageBreakdown[]): number {
  return breakdown.reduce((sum, item) => sum + item.consumedRatio, 0);
}

interface LotForResolvedConsumedRatio extends LotForConsumedRatio {
  status: LotStatus;
  consumedRatio: number | null;
  updatedAt?: string;
}

/**
 * NGUỒN SỰ THẬT DUY NHẤT của consumedRatio — mọi màn hình phải gọi hàm này,
 * tuyệt đối không đọc lot.consumedRatio trực tiếp.
 *
 * - at_garden / in_transit: bỏ qua giá trị đã lưu (luôn null ở 2 trạng thái này),
 *   tính tại chỗ từ harvestDate bằng getConsumedRatioBreakdown.
 * - in_stock: đọc consumedRatio đã lưu (do ESP32/app ghi lúc updatedAt), cộng
 *   thêm phần tiêu hao trôi qua từ updatedAt đến now bằng nhiệt độ cảm biến
 *   gần nhất (stationTempC). Không có updatedAt hoặc không có nhiệt độ cảm
 *   biến thì không cộng dồn, trả nguyên giá trị đã lưu.
 * - sold / discarded: lô đã rời khỏi vòng theo dõi tươi/hỏng — trả nguyên
 *   consumedRatio đã lưu tại thời điểm đó, KHÔNG cộng drift theo nhiệt độ kho
 *   (lô không còn nằm trong kho để mà hao mòn theo nhiệt độ kho nữa).
 */
export function resolveConsumedRatio(
  lot: LotForResolvedConsumedRatio,
  assumedTempConfig: AssumedTempConfig,
  stationTempC: number | undefined,
  now: Date = new Date()
): number {
  if (lot.status === 'at_garden' || lot.status === 'in_transit') {
    return getTotalConsumedRatio(getConsumedRatioBreakdown(lot, assumedTempConfig, stationTempC, now));
  }

  const storedRatio = lot.consumedRatio ?? 0;
  if (lot.status === 'sold' || lot.status === 'discarded') return storedRatio;
  if (!lot.updatedAt || stationTempC === undefined) return storedRatio;

  const drift = getStageConsumedRatio(new Date(lot.updatedAt), now, stationTempC, lot.initialShelfDays);
  return storedRatio + drift;
}
