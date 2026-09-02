import { useEffect, useState } from 'react';
import { USE_MOCK } from '../config';
import { useAuth } from '../context/AuthContext';
import { useLots } from '../state/LotsContext';
import { subscribeLotsByGrower } from '../services/lots';
import { isPermissionDeniedError } from '../lib/firebaseErrors';
import type { Lot } from '../mocks/lots';

interface UseLotsByGrowerResult {
  lots: Lot[];
  loading: boolean;
  error: string | null;
}

/** Lô của một chủ vườn — query theo growerId thay vì lọc từ toàn bộ danh sách lô. */
export function useLotsByGrower(growerId: string | undefined): UseLotsByGrowerResult {
  const { loading: authLoading, profile } = useAuth();
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
    if (authLoading) {
      setLoading(true);
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
        if (isPermissionDeniedError(err)) {
          setLoading(true);
          return;
        }
        setError(err.message);
        setLoading(false);
      }
    );
    return unsubscribe;
  }, [growerId, authLoading, profile?.uid]);

  if (USE_MOCK) {
    return { lots: allLots.filter((lot) => lot.growerId === growerId), loading: false, error: null };
  }
  return { lots: firebaseLots, loading, error };
}
