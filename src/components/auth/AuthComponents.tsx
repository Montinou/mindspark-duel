'use client';

import { useStackApp } from "@stackframe/stack";



export function LoginButton({ className }: { className?: string }) {
  const app = useStackApp();
  return (
    <a
      href={app.urls.signIn}
      className={className || "px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"}
    >
      Login
    </a>
  );
}

export function SignupButton({ className }: { className?: string }) {
  const app = useStackApp();
  return (
    <a
      href={app.urls.signUp}
      className={className || "px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"}
    >
      Sign Up
    </a>
  );
}

import { LogOut } from "lucide-react";

export function UserButton({ collapsed = false }: { collapsed?: boolean }) {
  const app = useStackApp();
  const user = app.useUser();

  if (!user) return null;

  return (
    <div className={`flex items-center gap-2 w-full min-w-0 ${collapsed ? 'justify-center' : ''}`}>
      {!collapsed && (
        <div className="text-sm text-zinc-300 truncate flex-1" title={user.displayName || user.primaryEmail || ''}>
          {user.displayName || user.primaryEmail}
        </div>
      )}
      <button
        onClick={() => app.signOut()}
        className={`shrink-0 flex items-center justify-center rounded hover:bg-zinc-700 transition-colors ${
          collapsed ? 'p-2 text-zinc-400' : 'px-2 py-1 bg-zinc-800 text-zinc-400 text-xs'
        }`}
        title="Sign Out"
      >
        {collapsed ? <LogOut size={16} /> : "Sign Out"}
      </button>
    </div>
  );
}
