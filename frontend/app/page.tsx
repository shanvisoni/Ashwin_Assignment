'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getMe, logout } from '@/lib/api';

type User = { id: number; email: string } | null;

export default function HomePage() {
  const [user, setUser] = useState<User>(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getMe().then((res) => {
      if (cancelled) return;
      if (res.ok && res.data?.user) setUser(res.data.user);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleLogout() {
    setLoggingOut(true);
    await logout();
    setUser(null);
    setLoggingOut(false);
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-100 dark:bg-zinc-900">
        <p className="text-zinc-500 dark:text-zinc-400">Loading…</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-zinc-100 dark:bg-zinc-900">
      <header className="border-b border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-3">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <span className="font-semibold text-zinc-900 dark:text-zinc-50">Auth App</span>
          {user ? (
            <div className="flex items-center gap-3">
              <Link
                href="/media"
                className="text-sm font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 mr-2"
              >
                Media Gallery
              </Link>
              <span className="text-sm text-zinc-600 dark:text-zinc-400">{user.email}</span>
              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                className="rounded-lg border border-zinc-300 dark:border-zinc-600 px-3 py-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 disabled:opacity-50"
              >
                {loggingOut ? 'Signing out…' : 'Sign out'}
              </button>
            </div>
          ) : (
            <nav className="flex gap-3">
              <Link
                href="/signin"
                className="rounded-lg border border-zinc-300 dark:border-zinc-600 px-3 py-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700"
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
              >
                Sign up
              </Link>
            </nav>
          )}
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center p-6 text-center">
        {user ? (
          <>
            <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50 mb-2">
              Welcome back
            </h1>
            <p className="text-zinc-600 dark:text-zinc-400 mb-6">
              You are signed in as <strong>{user.email}</strong>.
            </p>
            <Link
              href="/media"
              className="rounded-lg bg-blue-600 px-5 py-2.5 font-medium text-white hover:bg-blue-700 transition-colors"
            >
              Go to Media Gallery &rarr;
            </Link>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50 mb-2">
              Sign up or sign in
            </h1>
            <p className="text-zinc-600 dark:text-zinc-400 mb-6 max-w-md">
              Create an account or sign in to continue. Your session is stored securely in HTTP-only cookies.
            </p>
            <div className="flex gap-4">
              <Link
                href="/signup"
                className="rounded-lg bg-blue-600 px-5 py-2.5 font-medium text-white hover:bg-blue-700"
              >
                Sign up
              </Link>
              <Link
                href="/signin"
                className="rounded-lg border border-zinc-300 dark:border-zinc-600 px-5 py-2.5 font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700"
              >
                Sign in
              </Link>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
