import { getMoods } from '@/lib/actions';
import { hasValidSession } from '@/lib/auth';
import MoodDashboard from './components/MoodDashboard';
import LoginScreen from './components/LoginScreen';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const authenticated = await hasValidSession();

  if (!authenticated) {
    return <LoginScreen />;
  }

  const moods = await getMoods();

  return <MoodDashboard moods={moods} />;
}
