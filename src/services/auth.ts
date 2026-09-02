import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from 'firebase/auth';
import { get, ref, set } from 'firebase/database';
import { getFirebaseAuth, getFirebaseDatabase } from './firebase';

export type Role = 'grower' | 'retailer';

export interface UserProfile {
  role: Role;
  name: string;
  orgName: string;
}

export interface RegisterInput extends UserProfile {
  email: string;
  password: string;
}

/** Đăng nhập bằng email/mật khẩu — chỉ xác thực, KHÔNG đọc role (gọi getUserProfile riêng). */
export async function signIn(email: string, password: string): Promise<User> {
  const credential = await signInWithEmailAndPassword(getFirebaseAuth(), email, password);
  return credential.user;
}

/** Tạo tài khoản Auth + ghi hồ sơ role/name/orgName vào users/{uid} trong cùng một lượt đăng ký. */
export async function registerUser(input: RegisterInput): Promise<User> {
  const credential = await createUserWithEmailAndPassword(getFirebaseAuth(), input.email, input.password);
  await set(ref(getFirebaseDatabase(), `users/${credential.user.uid}`), {
    role: input.role,
    name: input.name,
    orgName: input.orgName,
  });
  return credential.user;
}

export async function signOutUser(): Promise<void> {
  await signOut(getFirebaseAuth());
}

/** Đọc role/name/orgName của user — một lần (không subscribe), vì hồ sơ hiếm khi đổi trong phiên. */
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snapshot = await get(ref(getFirebaseDatabase(), `users/${uid}`));
  return snapshot.exists() ? (snapshot.val() as UserProfile) : null;
}

/** Theo dõi trạng thái đăng nhập Firebase (persist qua AsyncStorage) — trả về hàm huỷ lắng nghe. */
export function subscribeAuthState(onChange: (user: User | null) => void): () => void {
  return onAuthStateChanged(getFirebaseAuth(), onChange);
}
