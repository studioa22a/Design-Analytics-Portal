import { redirect } from 'next/navigation';

// The proxy already redirects anonymous users to /login; signed-in users land on the dashboard.
export default function Home() {
  redirect('/dashboard');
}
