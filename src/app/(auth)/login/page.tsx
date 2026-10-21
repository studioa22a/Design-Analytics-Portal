import { LoginForm } from './login-form';

export const metadata = { title: 'Sign in — Design Analytics Portal' };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">Design guideline applications</h1>
      <p className="mt-2 text-sm text-neutral-600">
        Enter your email and we will send you a sign-in link. No password needed.
      </p>
      <div className="mt-8">
        <LoginForm next={next} />
      </div>
    </main>
  );
}

// All portal pages read the session cookie; they render on the server per request.
export const instant = false;
