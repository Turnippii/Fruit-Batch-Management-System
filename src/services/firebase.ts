import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, getReactNativePersistence, initializeAuth, type Auth } from 'firebase/auth';
import { getDatabase, type Database } from 'firebase/database';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

interface FirebaseEnvConfig {
  apiKey?: string;
  authDomain?: string;
  databaseURL?: string;
  projectId?: string;
  appId?: string;
}

let cachedApp: FirebaseApp | null = null;
let cachedAuth: Auth | null = null;
let cachedDatabase: Database | null = null;

function readFirebaseConfig(): FirebaseEnvConfig {
  const config = (Constants.expoConfig?.extra?.firebase ?? {}) as FirebaseEnvConfig;
  if (!config.apiKey || !config.databaseURL) {
    throw new Error(
      'Thiếu cấu hình Firebase (EXPO_PUBLIC_FB_*). Kiểm tra file .env rồi chạy lại `expo start -c`. ' +
        'Nếu đang demo mà mạng/Firebase hỏng, bật USE_MOCK = true trong src/config.ts thay vì sửa ở đây.'
    );
  }
  return config;
}

function getFirebaseApp(): FirebaseApp {
  if (!cachedApp) {
    cachedApp = getApps().length ? getApp() : initializeApp(readFirebaseConfig());
  }
  return cachedApp;
}

// Khởi tạo trễ (lazy) — chỉ chạm vào Firebase khi có lệnh gọi service thật đầu
// tiên. Khi USE_MOCK = true, các hook/context không bao giờ gọi tới đây, nên
// app khởi động được kể cả khi .env thiếu hoặc Firebase không truy cập được.
export function getFirebaseAuth(): Auth {
  if (!cachedAuth) {
    const app = getFirebaseApp();
    // initializeAuth chỉ được gọi một lần cho mỗi app — Fast Refresh có thể chạy
    // lại module này, nên rơi về getAuth() nếu đã khởi tạo trước đó thay vì crash.
    try {
      cachedAuth = initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });
    } catch {
      cachedAuth = getAuth(app);
    }
  }
  return cachedAuth;
}

export function getFirebaseDatabase(): Database {
  if (!cachedDatabase) {
    cachedDatabase = getDatabase(getFirebaseApp());
  }
  return cachedDatabase;
}
