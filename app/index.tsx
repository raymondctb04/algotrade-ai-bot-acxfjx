
import { Redirect } from 'expo-router';

export default function Index() {
  console.log('Redirecting to dashboard...');
  return <Redirect href="/(tabs)/dashboard" />;
}
