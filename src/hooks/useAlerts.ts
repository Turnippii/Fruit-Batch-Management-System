import { useEffect, useState } from 'react';
import { USE_MOCK } from '../config';
import { useAuth } from '../context/AuthContext';
import { mockAlerts } from '../mocks/lots';
import { subscribeAlertsByGrower, subscribeAlertsByRetailer, type AlertRecord } from '../services/alerts';
import { isPermissionDeniedError } from '../lib/firebaseErrors';
import type { Role } from '../services/auth';

interface UseAlertsResult {
  alerts: AlertRecord[];
  loading: boolean;
  error: string | null;
}

/** Đại lý thấy cảnh báo của kho mình (retailerId); chủ vườn thấy cảnh báo của lô mình gửi đi (growerId). */
export function useAlerts(role: Role | undefined, uid: string | undefined): UseAlertsResult {
  const { loading: authLoading, profile } = useAuth();
  const [alerts, setAlerts] = useState<AlertRecord[]>([]);
  const [loading, setLoading] = useState(!USE_MOCK && !!role && !!uid);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (USE_MOCK) return;
    if (!role || !uid) {
      setAlerts([]);
      setLoading(false);
      return;
    }
    if (authLoading) {
      setLoading(true);
      return;
    }
    setLoading(true);
    const subscribe = role === 'retailer' ? subscribeAlertsByRetailer : subscribeAlertsByGrower;
    const unsubscribe = subscribe(
      uid,
      (next) => {
        setAlerts(next);
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
  }, [role, uid, authLoading, profile?.uid]);

  if (USE_MOCK) {
    const field = role === 'retailer' ? 'retailerId' : 'growerId';
    return { alerts: mockAlerts.filter((alert) => alert[field] === uid), loading: false, error: null };
  }
  return { alerts, loading, error };
}
