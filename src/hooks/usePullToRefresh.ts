import { useCallback, useState } from 'react';

const MIN_VISIBLE_MS = 500;

/**
 * Danh sách trong app đến từ listener realtime của Firebase (luôn mới sẵn) hoặc
 * dữ liệu mock tĩnh — không có gì để "tải lại" ngoài config/* (dữ liệu DUY NHẤT
 * còn cache lâu dài ở client, xem useConfig().refetch). Hook này gọi `onRefresh`
 * (nếu có) rồi giữ spinner tối thiểu MIN_VISIBLE_MS để thao tác kéo luôn có phản
 * hồi rõ ràng, kể cả khi việc tải lại xong gần như ngay lập tức.
 */
export function usePullToRefresh(onRefresh?: () => Promise<void> | void) {
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(() => {
    setRefreshing(true);
    const startedAt = Date.now();
    Promise.resolve()
      .then(() => onRefresh?.())
      .catch(() => {})
      .finally(() => {
        const elapsed = Date.now() - startedAt;
        setTimeout(() => setRefreshing(false), Math.max(0, MIN_VISIBLE_MS - elapsed));
      });
  }, [onRefresh]);

  return { refreshing, onRefresh: refresh };
}
