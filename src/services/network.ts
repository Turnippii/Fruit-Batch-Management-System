import { onValue, ref, type Unsubscribe } from 'firebase/database';
import { getFirebaseDatabase } from './firebase';

type ConnectionCallback = (connected: boolean) => void;

/**
 * `.info/connected` là node đặc biệt của Realtime Database — Firebase SDK tự cập
 * nhật true/false đúng theo trạng thái kết nối WebSocket hiện tại tới backend, và
 * tự phát hiện lại kết nối khi mạng có lại. Dùng đúng cơ chế sẵn có của SDK đang
 * dùng thay vì thêm thư viện native (NetInfo).
 */
export function subscribeConnectionState(onData: ConnectionCallback): Unsubscribe {
  return onValue(ref(getFirebaseDatabase(), '.info/connected'), (snapshot) => {
    onData(snapshot.val() === true);
  });
}
