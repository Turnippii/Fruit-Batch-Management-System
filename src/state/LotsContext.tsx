import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { USE_MOCK } from '../config';
import { mockLots, Lot } from '../mocks/lots';
import * as lotsService from '../services/lots';

interface LotsContextValue {
  lots: Lot[];
  loading: boolean;
  error: string | null;
  getLotById: (id: string) => Lot | undefined;
  addLot: (lot: Lot) => Promise<void>;
  updateLot: (id: string, patch: Partial<Lot>) => Promise<void>;
  deleteLot: (id: string) => Promise<void>;
}

const LotsContext = createContext<LotsContextValue | null>(null);

export function LotsProvider({ children }: { children: React.ReactNode }) {
  const [lots, setLots] = useState<Lot[]>(() => (USE_MOCK ? mockLots.map((lot) => ({ ...lot })) : []));
  const [loading, setLoading] = useState(!USE_MOCK);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (USE_MOCK) return;
    const unsubscribe = lotsService.subscribeAllLots(
      (nextLots) => {
        setLots(nextLots);
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

  const value = useMemo<LotsContextValue>(
    () => ({
      lots,
      loading,
      error,
      getLotById: (id) => lots.find((lot) => lot.id === id),
      async addLot(lot) {
        if (USE_MOCK) {
          setLots((prev) => [lot, ...prev]);
          return;
        }
        await lotsService.addLot(lot);
      },
      async updateLot(id, patch) {
        if (USE_MOCK) {
          setLots((prev) => prev.map((lot) => (lot.id === id ? { ...lot, ...patch } : lot)));
          return;
        }
        await lotsService.updateLot(id, patch);
      },
      async deleteLot(id) {
        if (USE_MOCK) {
          setLots((prev) => prev.filter((lot) => lot.id !== id));
          return;
        }
        await lotsService.deleteLot(id);
      },
    }),
    [lots, loading, error]
  );

  return <LotsContext.Provider value={value}>{children}</LotsContext.Provider>;
}

export function useLots(): LotsContextValue {
  const ctx = useContext(LotsContext);
  if (!ctx) throw new Error('useLots phải được gọi bên trong LotsProvider');
  return ctx;
}
