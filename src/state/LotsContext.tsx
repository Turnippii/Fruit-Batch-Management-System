import { createContext, useContext, useMemo, useState } from 'react';
import { mockLots, Lot } from '../mocks/lots';

interface LotsContextValue {
  lots: Lot[];
  getLotById: (id: string) => Lot | undefined;
  addLot: (lot: Lot) => void;
  updateLot: (id: string, patch: Partial<Lot>) => void;
  deleteLot: (id: string) => void;
}

const LotsContext = createContext<LotsContextValue | null>(null);

export function LotsProvider({ children }: { children: React.ReactNode }) {
  const [lots, setLots] = useState<Lot[]>(() => mockLots.map((lot) => ({ ...lot })));

  const value = useMemo<LotsContextValue>(
    () => ({
      lots,
      getLotById: (id) => lots.find((lot) => lot.id === id),
      addLot: (lot) => setLots((prev) => [lot, ...prev]),
      updateLot: (id, patch) =>
        setLots((prev) => prev.map((lot) => (lot.id === id ? { ...lot, ...patch } : lot))),
      deleteLot: (id) => setLots((prev) => prev.filter((lot) => lot.id !== id)),
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
