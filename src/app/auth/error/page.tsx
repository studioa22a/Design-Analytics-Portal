import Link from 'next/link';

const MESSAGES: Record<string, string> = {
  missing_code: 'The sign-in link was incomplete.',
  exchange_failed: 'The sign-in link has expired or was already used.',
};

export default async function AuthErrorPage({ searchParams }: { searchParams: Promise<{ reason?: string }> }) {
  const { reason } = await searchParams;
  const message = (reason && MESSAGES[reason]) || 'Sign-in did not complete.';
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">Sign-in problem</h1>
      <p className="mt-2 text-sm text-neutral-600">{message}</p>
      <Link href="/login" className="mt-6 text-sm font-medium underline">
        Request a new link
      </Link>
    </main>
  );
}

// All portal pages read the session cookie; they render on the server per request.
export const instant = false;
