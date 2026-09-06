import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type DemoTimeScale = 1 | 60 | 1440;

const ENABLED_KEY = '@fruittrace/demoEnabled';
const SCALE_KEY = '@fruittrace/demoTimeScale';
const TICK_MS = 1000;

interface DemoContextValue {
  enabled: boolean;
  timeScale: DemoTimeScale;
  /** Đồng hồ ẢO dùng để HIỂN THỊ (countdown, consumedRatio tính tại chỗ) — KHÔNG
   * bao giờ ghi giá trị suy ra từ đồng hồ này xuống Firebase. */
  now: Date;
  setEnabled: (value: boolean) => void;
  setTimeScale: (value: DemoTimeScale) => void;
}

const DemoContext = createContext<DemoContextValue | null>(null);

function isValidScale(value: number): value is DemoTimeScale {
  return value === 1 || value === 60 || value === 1440;
}

export function DemoProvider({ children }: { children: React.ReactNode }) {
  const [enabled, setEnabledState] = useState(false);
  const [timeScale, setTimeScaleState] = useState<DemoTimeScale>(1);
  const [now, setNow] = useState(() => new Date());

  // Neo (thời điểm thực, thời điểm ảo tương ứng) + tốc độ hiện hành — mỗi lần
  // bật/tắt hoặc đổi hệ số nén đều "chốt" đồng hồ ảo tại giá trị hiện tại vào neo
  // rồi mới đổi tốc độ, để đồng hồ ảo KHÔNG nhảy cóc lúc đổi, chỉ đổi TỐC ĐỘ chạy
  // tiếp từ đó (đúng ý "khi bật 1440x, lô vàng chuyển đỏ trong vài phút" — tính từ
  // lúc bật, không phải tính lại từ đầu).
  const anchorRealMs = useRef(Date.now());
  const anchorVirtualMs = useRef(Date.now());
  const effectiveScaleRef = useRef<number>(1);

  function virtualNowMs(realMs: number): number {
    return anchorVirtualMs.current + (realMs - anchorRealMs.current) * effectiveScaleRef.current;
  }

  function rebase(nextEffectiveScale: number) {
    const realMs = Date.now();
    anchorVirtualMs.current = virtualNowMs(realMs);
    anchorRealMs.current = realMs;
    effectiveScaleRef.current = nextEffectiveScale;
  }

  // Nạp cấu hình đã lưu lúc mở app — KHÔNG cố khôi phục đồng hồ ảo của phiên
  // trước, mỗi lần mở app neo lại từ bây giờ.
  useEffect(() => {
    (async () => {
      try {
        const [storedEnabled, storedScale] = await Promise.all([
          AsyncStorage.getItem(ENABLED_KEY),
          AsyncStorage.getItem(SCALE_KEY),
        ]);
        const nextEnabled = storedEnabled === 'true';
        const parsedScale = storedScale ? Number(storedScale) : 1;
        const nextScale = isValidScale(parsedScale) ? parsedScale : 1;
        rebase(nextEnabled ? nextScale : 1);
        setEnabledState(nextEnabled);
        setTimeScaleState(nextScale);
      } catch {
        // AsyncStorage lỗi/chưa có dữ liệu — giữ mặc định tắt demo, không chặn app.
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date(virtualNowMs(Date.now()))), TICK_MS);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function setEnabled(value: boolean) {
    rebase(value ? timeScale : 1);
    setEnabledState(value);
    AsyncStorage.setItem(ENABLED_KEY, value ? 'true' : 'false').catch(() => {});
  }

  function setTimeScale(value: DemoTimeScale) {
    rebase(enabled ? value : 1);
    setTimeScaleState(value);
    AsyncStorage.setItem(SCALE_KEY, String(value)).catch(() => {});
  }

  const value = useMemo<DemoContextValue>(
    () => ({ enabled, timeScale, now, setEnabled, setTimeScale }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [enabled, timeScale, now]
  );

  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
}

export function useDemo(): DemoContextValue {
  const ctx = useContext(DemoContext);
  if (!ctx) throw new Error('useDemo phải được gọi bên trong DemoProvider');
  return ctx;
}
