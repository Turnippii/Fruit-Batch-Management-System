import { useEffect, useState } from 'react';
import { USE_MOCK } from '../config';
import { mockAlerts } from '../mocks/lots';
import { subscribeAlerts, type AlertRecord } from '../services/alerts';

interface UseAlertsResult {
  alerts: AlertRecord[];
  loading: boolean;
  error: string | null;
}

export function useAlerts(): UseAlertsResult {
  const [alerts, setAlerts] = useState<AlertRecord[]>(USE_MOCK ? mockAlerts : []);
  const [loading, setLoading] = useState(!USE_MOCK);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (USE_MOCK) return;
    const unsubscribe = subscribeAlerts(
      (next) => {
        setAlerts(next);
        setLoading(false);
        setError(null);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );
    return unsubscribe;
  }, []);

  return { alerts, loading, error };
}
