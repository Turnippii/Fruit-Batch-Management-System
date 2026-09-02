import { equalTo, onValue, orderByChild, query, ref, type DataSnapshot } from 'firebase/database';
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
  /** Đại lý đang giữ lô liên quan lúc cảnh báo phát sinh — để lọc list theo currentHolderId. */
  retailerId: string;
  /** Chủ vườn của lô liên quan — để lọc list theo growerId (chủ vườn cần biết lô mình gửi đi có vấn đề gì). */
  growerId: string;
}

type AlertsCallback = (alerts: AlertRecord[]) => void;
type ErrorCallback = (error: Error) => void;
type Unsubscribe = () => void;

function alertsRef() {
  return ref(getFirebaseDatabase(), 'alerts');
}

function snapshotToAlerts(snapshot: DataSnapshot): AlertRecord[] {
  const val = snapshot.val() as Record<string, Omit<AlertRecord, 'id'>> | null;
  if (!val) return [];
  return Object.entries(val).map(([id, value]) => ({ id, ...value }));
}

export function subscribeAlertsByRetailer(retailerId: string, onData: AlertsCallback, onError?: ErrorCallback): Unsubscribe {
  const q = query(alertsRef(), orderByChild('retailerId'), equalTo(retailerId));
  return onValue(
    q,
    (snapshot) => onData(snapshotToAlerts(snapshot)),
    (error) => onError?.(error)
  );
}

export function subscribeAlertsByGrower(growerId: string, onData: AlertsCallback, onError?: ErrorCallback): Unsubscribe {
  const q = query(alertsRef(), orderByChild('growerId'), equalTo(growerId));
  return onValue(
    q,
    (snapshot) => onData(snapshotToAlerts(snapshot)),
    (error) => onError?.(error)
  );
}
