import { useEffect, useState } from 'react';
import { USE_MOCK } from '../config';
import { subscribeConnectionState } from '../services/network';

const OFFLINE_SHOW_DELAY_MS = 1500;

/**
 * true = mất kết nối tới Firebase. Ở chế độ mock luôn false (dữ liệu hoàn toàn
 * cục bộ, không có khái niệm mạng).
 *
 * Trễ một nhịp trước khi báo mất mạng — `.info/connected` bắt đầu bằng false lúc
 * WebSocket chưa kịp bắt tay xong (vài trăm ms lúc mở app), báo ngay sẽ nháy băng
 * "offline" dù mạng vẫn ổn. Ẩn lại thì KHÔNG trễ — có kết nối là ẩn ngay.
 */
export function useIsOffline(): boolean {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    if (USE_MOCK) return;
    let showTimer: ReturnType<typeof setTimeout> | null = null;

    const unsubscribe = subscribeConnectionState((connected) => {
      if (showTimer) {
        clearTimeout(showTimer);
        showTimer = null;
      }
      if (connected) {
        setOffline(false);
        return;
      }
      showTimer = setTimeout(() => setOffline(true), OFFLINE_SHOW_DELAY_MS);
    });

    return () => {
      if (showTimer) clearTimeout(showTimer);
      unsubscribe();
    };
  }, []);

  return offline;
}
