'use client';

import { useStackApp } from "@stackframe/stack";

export function LoginButton() {
  const app = useStackApp();
  return (
    <button
      onClick={() => app.urls.signIn}
      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
    >
      Login
    </button>
  );
}

export function SignupButton() {
  const app = useStackApp();
  return (
    <button
      onClick={() => app.urls.signUp}
      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
    >
      Sign Up
    </button>
  );
}

export function UserButton() {
  const app = useStackApp();
  const user = app.useUser();

  if (!user) return null;

  return (
    <div className="flex items-center gap-4">
      <div className="text-sm text-zinc-300">
        {user.displayName || user.primaryEmail}
      </div>
      <button
        onClick={() => app.signOut()}
        className="px-3 py-1 bg-zinc-800 text-zinc-400 rounded hover:bg-zinc-700 transition-colors text-sm"
      >
        Sign Out
      </button>
    </div>
  );
}
