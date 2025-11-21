'use client';

import { useStackApp } from "@stackframe/stack";

import Link from "next/link";

export function LoginButton({ className }: { className?: string }) {
  const app = useStackApp();
  return (
    <Link
      href={app.urls.signIn}
      className={className || "px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"}
    >
      Login
    </Link>
  );
}

export function SignupButton({ className }: { className?: string }) {
  const app = useStackApp();
  return (
    <Link
      href={app.urls.signUp}
      className={className || "px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"}
    >
      Sign Up
    </Link>
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
