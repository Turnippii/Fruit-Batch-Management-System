import { useEffect, useState } from 'react';
import { USE_MOCK } from '../config';
import { mockStation } from '../mocks/lots';
import { subscribeStationByRetailer, type Station } from '../services/stations';

interface UseStationTempResult {
  station: Station | null;
  loading: boolean;
  error: string | null;
}

/** Trạm IoT của đại lý đang giữ lô (hoặc đại lý đang đăng nhập) — truyền vào retailerId tương ứng. */
export function useStationTemp(retailerId: string | undefined): UseStationTempResult {
  const [station, setStation] = useState<Station | null>(USE_MOCK ? { ...mockStation } : null);
  const [loading, setLoading] = useState(!USE_MOCK && !!retailerId);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (USE_MOCK) return;
    if (!retailerId) {
      setStation(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsubscribe = subscribeStationByRetailer(
      retailerId,
      (next) => {
        setStation(next);
        setLoading(false);
        setError(null);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );
    return unsubscribe;
  }, [retailerId]);

  return { station, loading, error };
}
