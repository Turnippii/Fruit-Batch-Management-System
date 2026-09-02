import type { Persistence } from 'firebase/auth';

/**
 * `firebase`'s package.json lists a platform-neutral "types" condition BEFORE
 * "react-native" in @firebase/auth's exports map. TypeScript always resolves the
 * "types" condition (moduleResolution: bundler), so it only ever sees the generic
 * auth-public.d.ts, which excludes RN-only APIs like getReactNativePersistence —
 * even though Metro correctly loads the real React Native build at runtime (it
 * doesn't request the "types" condition, so it falls through to "react-native").
 * This augmentation only patches the missing type; it changes nothing at runtime.
 */
declare module 'firebase/auth' {
  interface ReactNativeAsyncStorageLike {
    setItem(key: string, value: string): Promise<void>;
    getItem(key: string): Promise<string | null>;
    removeItem(key: string): Promise<void>;
  }

  export function getReactNativePersistence(storage: ReactNativeAsyncStorageLike): Persistence;
}
