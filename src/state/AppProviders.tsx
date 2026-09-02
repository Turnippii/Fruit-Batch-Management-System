import { AuthProvider } from '../context/AuthContext';
import { LotsProvider } from './LotsContext';

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <LotsProvider>{children}</LotsProvider>
    </AuthProvider>
  );
}
