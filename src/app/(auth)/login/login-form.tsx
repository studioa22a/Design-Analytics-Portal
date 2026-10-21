'use client';

import { useActionState } from 'react';
import { sendMagicLink, type LoginState } from './actions';

const initial: LoginState = { status: 'idle' };

export function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(sendMagicLink, initial);

  if (state.status === 'sent') {
    return (
      <div className="rounded-md border border-neutral-200 bg-neutral-50 p-4 text-sm">
        <p className="font-medium">Check your email</p>
        <p className="mt-1 text-neutral-600">
          We sent a sign-in link to <span className="font-medium text-neutral-900">{state.email}</span>. It expires in
          one hour.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <label className="block">
        <span className="text-sm font-medium">Email</span>
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
          placeholder="you@example.com"
        />
      </label>
      {state.status === 'error' ? <p className="text-sm text-red-700">{state.message}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-60"
      >
        {pending ? 'Sending…' : 'Send sign-in link'}
      </button>
    </form>
  );
}
