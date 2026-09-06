import { AuthProvider } from '../context/AuthContext';
import { DemoProvider } from '../context/DemoContext';
import { LotsProvider } from './LotsContext';

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <DemoProvider>
        <LotsProvider>{children}</LotsProvider>
      </DemoProvider>
    </AuthProvider>
  );
}
