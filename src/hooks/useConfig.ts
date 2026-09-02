import { useEffect, useState } from 'react';
import { USE_MOCK } from '../config';
import { assumedTemp, ripenessFactor, ripenessSupported, shelfLifeBase } from '../mocks/config';
import { fetchConfig, type AppConfig } from '../services/config';

interface UseConfigResult {
  config: AppConfig | null;
  loading: boolean;
  error: string | null;
}

const MOCK_CONFIG: AppConfig = { shelfLifeBase, ripenessFactor, ripenessSupported, assumedTemp };

/** config/* gần như tĩnh — đọc một lần (services/config.ts đã cache), không subscribe onValue. */
export function useConfig(): UseConfigResult {
  const [config, setConfig] = useState<AppConfig | null>(USE_MOCK ? MOCK_CONFIG : null);
  const [loading, setLoading] = useState(!USE_MOCK);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (USE_MOCK) return;
    let cancelled = false;
    setLoading(true);
    fetchConfig()
      .then((next) => {
        if (cancelled) return;
        setConfig(next);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Không tải được cấu hình.');
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { config, loading, error };
}
