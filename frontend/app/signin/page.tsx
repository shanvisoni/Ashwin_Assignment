'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signin } from '@/lib/api';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 8;

export default function SigninPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function validate(): string | null {
    const trimmed = email.trim();
    if (!trimmed) return 'Email is required.';
    if (!EMAIL_REGEX.test(trimmed)) return 'Please enter a valid email.';
    if (!password) return 'Password is required.';
    if (password.length < MIN_PASSWORD) return `Password must be at least ${MIN_PASSWORD} characters.`;
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const err = validate();
    if (err) {
      setError(err);
      return;
    }
    setLoading(true);
    const res = await signin(email.trim().toLowerCase(), password);
    setLoading(false);
    if (res.ok) {
      router.push('/');
      router.refresh();
      return;
    }
    setError(res.error || 'Sign in failed. Please try again.');
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-100 dark:bg-zinc-900 p-4">
      <div className="w-full max-w-md rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 shadow-lg p-8">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50 mb-2">
          Sign in
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400 text-sm mb-6">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="text-blue-600 dark:text-blue-400 hover:underline">
            Sign up
          </Link>
        </p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && (
            <div
              className="rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-sm px-3 py-2"
              role="alert"
            >
              {error}
            </div>
          )}
          <div>
            <label htmlFor="signin-email" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Email
            </label>
            <input
              id="signin-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="you@example.com"
              disabled={loading}
            />
          </div>
          <div>
            <label htmlFor="signin-password" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Password
            </label>
            <input
              id="signin-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Your password"
              disabled={loading}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="mt-2 w-full rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-400 text-white font-medium py-2.5 transition-colors"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
