import { createContext, useContext, useMemo, useState } from 'react';
import { USE_MOCK } from '../config';
import { mockLots, Lot } from '../mocks/lots';
import * as lotsService from '../services/lots';

interface LotsContextValue {
  /**
   * Chỉ có dữ liệu ở chế độ mock. Ở chế độ Firebase thật, KHÔNG có subscribe
   * toàn bộ lots/ nữa — database.rules.json chỉ cho đọc list khi query lọc
   * đúng growerId/currentHolderId = uid của mình (xem useLotsByGrower,
   * useLotsByHolder, useLotById), một listen không lọc sẽ bị permission-denied.
   */
  lots: Lot[];
  loading: boolean;
  error: string | null;
  addLot: (lot: Lot) => Promise<void>;
  updateLot: (id: string, patch: Partial<Lot>) => Promise<void>;
  deleteLot: (id: string) => Promise<void>;
}

const LotsContext = createContext<LotsContextValue | null>(null);

export function LotsProvider({ children }: { children: React.ReactNode }) {
  const [lots, setLots] = useState<Lot[]>(() => (USE_MOCK ? mockLots.map((lot) => ({ ...lot })) : []));

  const value = useMemo<LotsContextValue>(
    () => ({
      lots,
      loading: false,
      error: null,
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
    [lots]
  );

  return <LotsContext.Provider value={value}>{children}</LotsContext.Provider>;
}

export function useLots(): LotsContextValue {
  const ctx = useContext(LotsContext);
  if (!ctx) throw new Error('useLots phải được gọi bên trong LotsProvider');
  return ctx;
}
