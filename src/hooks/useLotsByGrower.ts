import { useEffect, useState } from 'react';
import { USE_MOCK } from '../config';
import { useLots } from '../state/LotsContext';
import { subscribeLotsByGrower } from '../services/lots';
import type { Lot } from '../mocks/lots';

interface UseLotsByGrowerResult {
  lots: Lot[];
  loading: boolean;
  error: string | null;
}

/** Lô của một chủ vườn — query theo growerId thay vì lọc từ toàn bộ danh sách lô. */
export function useLotsByGrower(growerId: string | undefined): UseLotsByGrowerResult {
  const { lots: allLots } = useLots();
  const [firebaseLots, setFirebaseLots] = useState<Lot[]>([]);
  const [loading, setLoading] = useState(!USE_MOCK && !!growerId);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (USE_MOCK) return;
    if (!growerId) {
      setFirebaseLots([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsubscribe = subscribeLotsByGrower(
      growerId,
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
  }, [growerId]);

  if (USE_MOCK) {
    return { lots: allLots.filter((lot) => lot.growerId === growerId), loading: false, error: null };
  }
  return { lots: firebaseLots, loading, error };
}
