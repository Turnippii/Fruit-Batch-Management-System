import { equalTo, onValue, orderByChild, query, ref, remove, set, update, type DataSnapshot } from 'firebase/database';
import { getFirebaseDatabase } from './firebase';
import type { Lot } from '../mocks/lots';

export type Unsubscribe = () => void;
type LotsCallback = (lots: Lot[]) => void;
type LotCallback = (lot: Lot | null) => void;
type ErrorCallback = (error: Error) => void;

function lotsRef() {
  return ref(getFirebaseDatabase(), 'lots');
}

function lotRef(lotId: string) {
  return ref(getFirebaseDatabase(), `lots/${lotId}`);
}

// RTDB không lưu literal null — field null/undefined khi đọc lại sẽ vắng mặt.
// Chuẩn hoá lại đúng kiểu Lot (consumedRatio: number | null) để phần còn lại
// của app không phải phân biệt undefined vs null.
function toLot(id: string, value: Omit<Lot, 'id'>): Lot {
  return {
    ...value,
    id,
    consumedRatio: value.consumedRatio ?? null,
    history: value.history ?? [],
  };
}

function snapshotToLots(snapshot: DataSnapshot): Lot[] {
  const val = snapshot.val() as Record<string, Omit<Lot, 'id'>> | null;
  if (!val) return [];
  return Object.entries(val).map(([id, value]) => toLot(id, value));
}

export function subscribeAllLots(onData: LotsCallback, onError?: ErrorCallback): Unsubscribe {
  return onValue(
    lotsRef(),
    (snapshot) => onData(snapshotToLots(snapshot)),
    (error) => onError?.(error)
  );
}

/** Kho của một đại lý — lọc theo currentHolderId, dùng cho màn "Kho đại lý". */
export function subscribeLotsByHolder(holderId: string, onData: LotsCallback, onError?: ErrorCallback): Unsubscribe {
  const q = query(lotsRef(), orderByChild('currentHolderId'), equalTo(holderId));
  return onValue(
    q,
    (snapshot) => onData(snapshotToLots(snapshot)),
    (error) => onError?.(error)
  );
}

/** Lô của một chủ vườn — lọc theo growerId, dùng cho màn "Trang chủ" chủ vườn. */
export function subscribeLotsByGrower(growerId: string, onData: LotsCallback, onError?: ErrorCallback): Unsubscribe {
  const q = query(lotsRef(), orderByChild('growerId'), equalTo(growerId));
  return onValue(
    q,
    (snapshot) => onData(snapshotToLots(snapshot)),
    (error) => onError?.(error)
  );
}

export function subscribeLotById(lotId: string, onData: LotCallback, onError?: ErrorCallback): Unsubscribe {
  return onValue(
    lotRef(lotId),
    (snapshot) => onData(snapshot.exists() ? toLot(lotId, snapshot.val()) : null),
    (error) => onError?.(error)
  );
}

export async function addLot(lot: Lot): Promise<void> {
  const { id, ...rest } = lot;
  await set(lotRef(id), rest);
}

export async function updateLot(lotId: string, patch: Partial<Lot>): Promise<void> {
  const { id: _ignored, ...rest } = patch;
  // RTDB update() ném lỗi nếu value là undefined (khác null — null nghĩa là
  // xoá field đó). Các form trong app hay set optional field = undefined để
  // "xoá", nên chuẩn hoá về null ở đây thay vì bắt từng nơi gọi phải nhớ.
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(rest)) {
    sanitized[key] = value === undefined ? null : value;
  }
  await update(lotRef(lotId), sanitized);
}

export async function deleteLot(lotId: string): Promise<void> {
  await remove(lotRef(lotId));
}
