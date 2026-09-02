import { useEffect, useState } from 'react';
import { USE_MOCK } from '../config';
import { useLots } from '../state/LotsContext';
import { subscribeLotById } from '../services/lots';
import type { Lot } from '../mocks/lots';

interface UseLotByIdResult {
  lot: Lot | undefined;
  loading: boolean;
  error: string | null;
}

/**
 * Subscribe realtime trực tiếp vào đúng một lô (onValue trên lots/{id}) thay vì lọc
 * từ danh sách toàn bộ lô — phù hợp cho màn chi tiết. Ở chế độ mock, LotsContext đã
 * giữ sẵn toàn bộ mảng trong bộ nhớ nên chỉ cần lọc, khỏi cần "subscribe" riêng.
 */
export function useLotById(id: string | undefined): UseLotByIdResult {
  const { lots, loading: lotsLoading } = useLots();
  const [firebaseLot, setFirebaseLot] = useState<Lot | undefined>(undefined);
  const [loading, setLoading] = useState(!USE_MOCK);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (USE_MOCK || !id) return;
    setLoading(true);
    const unsubscribe = subscribeLotById(
      id,
      (lot) => {
        setFirebaseLot(lot ?? undefined);
        setLoading(false);
        setError(null);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );
    return unsubscribe;
  }, [id]);

  if (USE_MOCK) {
    return { lot: lots.find((lot) => lot.id === id), loading: lotsLoading, error: null };
  }
  return { lot: firebaseLot, loading, error };
}
