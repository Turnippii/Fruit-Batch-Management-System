import { useCallback, useEffect, useRef, useState } from 'react';
import { USE_MOCK } from '../config';
import { assumedTemp, ripenessFactor, ripenessSupported, shelfLifeBase } from '../mocks/config';
import { clearConfigCache, fetchConfig, type AppConfig } from '../services/config';

interface UseConfigResult {
  config: AppConfig | null;
  loading: boolean;
  error: string | null;
  /** Xoá cache và tải lại config/* — dùng cho pull-to-refresh (xem usePullToRefresh),
   * vì đây là dữ liệu DUY NHẤT trong app còn cache lâu dài ở phía client. */
  refetch: () => Promise<void>;
}

const MOCK_CONFIG: AppConfig = { shelfLifeBase, ripenessFactor, ripenessSupported, assumedTemp };

/** config/* gần như tĩnh — đọc một lần (services/config.ts đã cache), không subscribe onValue. */
export function useConfig(): UseConfigResult {
  const [config, setConfig] = useState<AppConfig | null>(USE_MOCK ? MOCK_CONFIG : null);
  const [loading, setLoading] = useState(!USE_MOCK);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(
    () => () => {
      mountedRef.current = false;
    },
    []
  );

  const load = useCallback((forceRefresh: boolean) => {
    if (USE_MOCK) return Promise.resolve();
    if (forceRefresh) clearConfigCache();
    setLoading(true);
    return fetchConfig()
      .then((next) => {
        if (!mountedRef.current) return;
        setConfig(next);
        setLoading(false);
        setError(null);
      })
      .catch((err) => {
        if (!mountedRef.current) return;
        setError(err instanceof Error ? err.message : 'Không tải được cấu hình.');
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    load(false);
  }, [load]);

  return { config, loading, error, refetch: () => load(true) };
}
