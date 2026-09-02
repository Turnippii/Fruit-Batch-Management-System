import { get, ref } from 'firebase/database';
import { getFirebaseDatabase } from './firebase';
import type { AssumedTempConfig } from '../mocks/config';

export interface AppConfig {
  shelfLifeBase: Record<string, number>;
  ripenessFactor: Record<string, number>;
  ripenessSupported: string[];
  assumedTemp: AssumedTempConfig;
}

const FALLBACK_ASSUMED_TEMP: AssumedTempConfig = {
  at_garden_normal: 30,
  at_garden_cold: 15,
  in_transit: 32,
  in_transit_cold: 18,
};

let cachedConfig: AppConfig | null = null;
let pendingFetch: Promise<AppConfig> | null = null;

/** Đọc config/* một lần rồi cache trong bộ nhớ tiến trình — config gần như không đổi khi app đang chạy. */
export async function fetchConfig(): Promise<AppConfig> {
  if (cachedConfig) return cachedConfig;
  if (!pendingFetch) {
    pendingFetch = get(ref(getFirebaseDatabase(), 'config'))
      .then((snapshot) => {
        const val = (snapshot.val() ?? {}) as Partial<AppConfig>;
        const config: AppConfig = {
          shelfLifeBase: val.shelfLifeBase ?? {},
          ripenessFactor: val.ripenessFactor ?? {},
          ripenessSupported: val.ripenessSupported ?? [],
          assumedTemp: val.assumedTemp ?? FALLBACK_ASSUMED_TEMP,
        };
        cachedConfig = config;
        return config;
      })
      .finally(() => {
        pendingFetch = null;
      });
  }
  return pendingFetch;
}

/** Chỉ dùng cho test/hot-reload thủ công — buộc lần gọi fetchConfig() kế tiếp đọc lại từ Firebase. */
export function clearConfigCache(): void {
  cachedConfig = null;
  pendingFetch = null;
}
