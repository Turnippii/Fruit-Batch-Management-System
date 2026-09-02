import { onValue, ref, type DataSnapshot } from 'firebase/database';
import { getFirebaseDatabase } from './firebase';
import type { StatusColorKey } from '../constants/theme';

export interface AlertRecord {
  id: string;
  lotId: string;
  level: StatusColorKey;
  type: string;
  createdAt: string;
  isRead: boolean;
  message: string;
}

type AlertsCallback = (alerts: AlertRecord[]) => void;
type ErrorCallback = (error: Error) => void;
type Unsubscribe = () => void;

function snapshotToAlerts(snapshot: DataSnapshot): AlertRecord[] {
  const val = snapshot.val() as Record<string, Omit<AlertRecord, 'id'>> | null;
  if (!val) return [];
  return Object.entries(val).map(([id, value]) => ({ id, ...value }));
}

export function subscribeAlerts(onData: AlertsCallback, onError?: ErrorCallback): Unsubscribe {
  return onValue(
    ref(getFirebaseDatabase(), 'alerts'),
    (snapshot) => onData(snapshotToAlerts(snapshot)),
    (error) => onError?.(error)
  );
}
