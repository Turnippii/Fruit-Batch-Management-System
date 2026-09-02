import { useEffect, useState } from 'react';
import { USE_MOCK } from '../config';
import { useAuth } from '../context/AuthContext';
import { useLots } from '../state/LotsContext';
import { subscribeLotsByHolder } from '../services/lots';
import { isPermissionDeniedError } from '../lib/firebaseErrors';
import type { Lot } from '../mocks/lots';

interface UseLotsByHolderResult {
  lots: Lot[];
  loading: boolean;
  error: string | null;
}

/** Kho của một đại lý — query theo currentHolderId thay vì lọc từ toàn bộ danh sách lô. */
export function useLotsByHolder(holderId: string | undefined): UseLotsByHolderResult {
  const { loading: authLoading, profile } = useAuth();
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
    // Chờ AuthContext có token thật trước khi mở listener — tránh query bằng
    // token cũ/rỗng ngay lúc app vừa mở hoặc vừa đổi tài khoản.
    if (authLoading) {
      setLoading(true);
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
        if (isPermissionDeniedError(err)) {
          // Thoáng qua lúc chuyển tài khoản — không hiện lỗi thật, coi như đang tải.
          setLoading(true);
          return;
        }
        setError(err.message);
        setLoading(false);
      }
    );
    // Effect cleanup chạy TRƯỚC khi effect kế tiếp chạy (React đảm bảo) — huỷ
    // listener mang uid/token cũ trước khi subscribe lại với uid/token mới.
    return unsubscribe;
  }, [holderId, authLoading, profile?.uid]);

  if (USE_MOCK) {
    return { lots: allLots.filter((lot) => lot.currentHolderId === holderId), loading: allLoading, error: null };
  }
  return { lots: firebaseLots, loading, error };
}
