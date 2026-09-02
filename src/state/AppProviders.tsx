import { SessionProvider } from './SessionContext';
import { LotsProvider } from './LotsContext';

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <LotsProvider>{children}</LotsProvider>
    </SessionProvider>
  );
}
