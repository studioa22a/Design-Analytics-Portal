import { requireUser } from '@/db/session';

export const metadata = { title: 'Dashboard — Design Analytics Portal' };

const ROLE_LABEL: Record<string, string> = {
  submitter: 'Submitter',
  assessor: 'Assessor',
  developer: 'Developer',
};

export default async function DashboardPage() {
  const user = await requireUser();

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <header className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{user.displayName ?? user.email}</h1>
          <p className="mt-1 text-sm text-neutral-600">{user.email}</p>
        </div>
        <form action="/auth/signout" method="post">
          <button type="submit" className="text-sm underline">
            Sign out
          </button>
        </form>
      </header>

      <section className="mt-10">
        <h2 className="text-sm font-medium uppercase tracking-wide text-neutral-500">Your estates</h2>
        {user.memberships.length === 0 ? (
          <p className="mt-3 rounded-md border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-700">
            Your account is active but not yet linked to an estate. The estate&rsquo;s assessment team will add you;
            you will receive an email when that happens.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-neutral-200 rounded-md border border-neutral-200">
            {user.memberships.map((m) => (
              <li key={`${m.estateId}-${m.role}`} className="flex items-center justify-between px-4 py-3 text-sm">
                <span className="font-medium">{m.estateName}</span>
                <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-700">
                  {ROLE_LABEL[m.role] ?? m.role}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

// All portal pages read the session cookie; they render on the server per request.
export const instant = false;
