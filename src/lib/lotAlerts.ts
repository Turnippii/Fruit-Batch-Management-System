import type { AssumedTempConfig } from '../mocks/config';
import type { Lot } from '../mocks/lots';
import type { Role } from '../services/auth';
import { getRemainingDays, getRemainingDaysFloor, getRemainingRatio, getStatusColor, resolveConsumedRatio } from './shelfLife';

export type LotAlertLevel = 'yellow' | 'red';

export interface LotAlert {
  lot: Lot;
  level: LotAlertLevel;
  remainingDays: number;
  remainingDaysPrecise: number;
}

interface BuildLotAlertsOptions {
  role: Role;
  uid: string;
  assumedTemp: AssumedTempConfig;
  /** Retailer: their own station temp. Grower: undefined (rules don't let growers read retailer stations). */
  stationTemp: number | undefined;
  now: Date;
}

function isInScope(lot: Lot, role: Role, uid: string): boolean {
  if (role === 'retailer') return lot.status === 'in_stock' && lot.currentHolderId === uid;
  return lot.growerId === uid && lot.status !== 'sold' && lot.status !== 'discarded';
}

/**
 * Alerts are DERIVED from lots, never stored — a lot is an alert when its
 * status color (same thresholds as the stock screen) is yellow or red.
 * Sorted by remaining days ascending, ties broken by harvestDate ascending.
 */
export function buildLotAlerts(lots: Lot[], { role, uid, assumedTemp, stationTemp, now }: BuildLotAlertsOptions): LotAlert[] {
  const alerts: LotAlert[] = [];
  for (const lot of lots) {
    if (!isInScope(lot, role, uid)) continue;
    const consumedRatio = resolveConsumedRatio(lot, assumedTemp, stationTemp, now);
    const level = getStatusColor(getRemainingRatio(consumedRatio));
    if (level === 'green') continue;
    alerts.push({
      lot,
      level,
      remainingDays: getRemainingDaysFloor(lot.initialShelfDays, consumedRatio),
      remainingDaysPrecise: getRemainingDays(lot.initialShelfDays, consumedRatio),
    });
  }
  return alerts.sort((a, b) => {
    if (a.remainingDaysPrecise !== b.remainingDaysPrecise) {
      return a.remainingDaysPrecise - b.remainingDaysPrecise;
    }
    return new Date(a.lot.harvestDate).getTime() - new Date(b.lot.harvestDate).getTime();
  });
}
