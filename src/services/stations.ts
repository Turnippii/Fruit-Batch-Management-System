import { equalTo, onValue, orderByChild, query, ref, type DataSnapshot } from 'firebase/database';
import { getFirebaseDatabase } from './firebase';

export interface Station {
  stationId: string;
  name: string;
  temp: number;
  humid: number;
  updatedAt: string;
  retailerId: string;
}

type StationCallback = (station: Station | null) => void;
type ErrorCallback = (error: Error) => void;
type Unsubscribe = () => void;

function stationsRef() {
  return ref(getFirebaseDatabase(), 'stations');
}

function firstStation(snapshot: DataSnapshot): Station | null {
  const val = snapshot.val() as Record<string, Omit<Station, 'stationId'>> | null;
  if (!val) return null;
  const [stationId, value] = Object.entries(val)[0];
  return { stationId, ...value };
}

/**
 * Trạm IoT đang gắn với một đại lý cụ thể (stations/{id}.retailerId === retailerId).
 * Mỗi lô "in_stock" lấy nhiệt độ từ trạm của currentHolderId — không hardcode
 * một stationId cố định vì có thể có nhiều đại lý/nhiều trạm.
 */
export function subscribeStationByRetailer(
  retailerId: string,
  onData: StationCallback,
  onError?: ErrorCallback
): Unsubscribe {
  const q = query(stationsRef(), orderByChild('retailerId'), equalTo(retailerId));
  return onValue(
    q,
    (snapshot) => onData(firstStation(snapshot)),
    (error) => onError?.(error)
  );
}
