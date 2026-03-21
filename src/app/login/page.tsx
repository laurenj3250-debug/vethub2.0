'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Stethoscope } from 'lucide-react';
import { neoCard, neoButton, neoInput, NEO_POP } from '@/lib/neo-pop-styles';

export default function LoginPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Login failed');
        setLoading(false);
        return;
      }

      router.push('/residency');
    } catch {
      setError('Something went wrong. Try again.');
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ backgroundColor: NEO_POP.colors.cream }}
    >
      <div className={`${neoCard} p-8 w-full max-w-sm`}>
        <div className="flex items-center justify-center gap-3 mb-6">
          <Stethoscope size={32} strokeWidth={2.5} color={NEO_POP.colors.mintDark} />
          <h1 className="text-3xl font-bold" style={{ color: NEO_POP.text.primary }}>
            VetHub
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium mb-1"
              style={{ color: NEO_POP.text.secondary }}
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`${neoInput} w-full`}
              placeholder="Enter password"
              autoFocus
              required
            />
          </div>

          {error && (
            <p className="text-sm font-medium" style={{ color: NEO_POP.status.critical }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`${neoButton} w-full py-2.5 px-4`}
            style={{
              backgroundColor: loading ? NEO_POP.colors.gray200 : NEO_POP.colors.mint,
              color: NEO_POP.text.primary,
            }}
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
