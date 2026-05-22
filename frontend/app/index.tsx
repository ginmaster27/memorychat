import { Redirect } from 'expo-router';
import { useAuthStore } from '../src/store/authStore';

export default function IndexScreen() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const hasCheckedStoredSession = useAuthStore((state) => state.hasCheckedStoredSession);
  if (!hasCheckedStoredSession) return null;
  return <Redirect href={isAuthenticated ? '/conversations' : '/login'} />;
}
