import { useEffect, useState } from 'react';
import { USE_MOCK } from '../config';
import { useLots } from '../state/LotsContext';
import { subscribeLotsByHolder } from '../services/lots';
import type { Lot } from '../mocks/lots';

interface UseLotsByHolderResult {
  lots: Lot[];
  loading: boolean;
  error: string | null;
}

/** Kho của một đại lý — query theo currentHolderId thay vì lọc từ toàn bộ danh sách lô. */
export function useLotsByHolder(holderId: string | undefined): UseLotsByHolderResult {
  const { lots: allLots, loading: allLoading } = useLots();
  const [firebaseLots, setFirebaseLots] = useState<Lot[]>([]);
  const [loading, setLoading] = useState(!USE_MOCK && !!holderId);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (USE_MOCK) return;
    if (!holderId) {
      setFirebaseLots([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsubscribe = subscribeLotsByHolder(
      holderId,
      (next) => {
        setFirebaseLots(next);
        setLoading(false);
        setError(null);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );
    return unsubscribe;
  }, [holderId]);

  if (USE_MOCK) {
    return { lots: allLots.filter((lot) => lot.currentHolderId === holderId), loading: allLoading, error: null };
  }
  return { lots: firebaseLots, loading, error };
}
