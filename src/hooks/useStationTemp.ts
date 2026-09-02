import { useEffect, useState } from 'react';
import { USE_MOCK } from '../config';
import { mockStation } from '../mocks/lots';
import { subscribeStationByRetailer, type Station } from '../services/stations';
import { useAuth } from '../context/AuthContext';
import { isPermissionDeniedError } from '../lib/firebaseErrors';
import type { Role } from '../services/auth';

interface UseStationTempResult {
  /** undefined = không áp dụng (không phải đại lý) — khác null (đang tải/chưa có trạm). */
  station: Station | null | undefined;
  loading: boolean;
  error: string | null;
}

/**
 * Trạm IoT gắn với đại lý đang giữ lô. Truyền vào role của chủ sở hữu
 * currentHolderId (xem src/lib/lotHolder.ts) — nếu không phải 'retailer' thì
 * không subscribe gì cả (chủ vườn tra station theo uid của chính mình sẽ luôn
 * ra null vô ích, vì không có trạm nào gắn với chủ vườn).
 */
export function useStationTemp(retailerId: string | undefined, role: Role | undefined): UseStationTempResult {
  const { loading: authLoading, profile } = useAuth();
  const isRetailer = role === 'retailer';

  const [state, setState] = useState<UseStationTempResult>(() =>
    USE_MOCK
      ? { station: { ...mockStation }, loading: false, error: null }
      : { station: undefined, loading: isRetailer && !!retailerId, error: null }
  );

  useEffect(() => {
    if (USE_MOCK) return;

    if (!isRetailer) {
      setState({ station: undefined, loading: false, error: null });
      return;
    }
    // Chờ AuthContext có token thật trước khi mở listener — tránh query bằng
    // token cũ/rỗng ngay lúc app vừa mở hoặc vừa đổi tài khoản.
    if (!retailerId || authLoading) {
      setState({ station: null, loading: true, error: null });
      return;
    }

    setState({ station: null, loading: true, error: null });
    const unsubscribe = subscribeStationByRetailer(
      retailerId,
      (next) => {
        setState({ station: next, loading: false, error: null });
      },
      (err) => {
        if (isPermissionDeniedError(err)) {
          // Thoáng qua lúc chuyển tài khoản — không hiện lỗi thật, coi như đang tải.
          setState({ station: null, loading: true, error: null });
          return;
        }
        setState({ station: null, loading: false, error: err.message });
      }
    );
    // Effect cleanup chạy TRƯỚC khi effect kế tiếp chạy (React đảm bảo) — huỷ
    // listener mang uid/token cũ trước khi subscribe lại với uid/token mới.
    return unsubscribe;
  }, [isRetailer, retailerId, authLoading, profile?.uid]);

  return state;
}
