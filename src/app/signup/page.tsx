'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react';

export default function SignUpPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    // Client-side validation
    if (name.trim().length < 2) {
      setError('Name must be at least 2 characters');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address');
      return;
    }
    if (phone.replace(/\D/g, '').length < 10) {
      setError('Phone number must be at least 10 digits');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      // 1. Create account
      const res = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: email.trim().toLowerCase(), phone: phone.trim(), password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to create account');
        setLoading(false);
        return;
      }

      // 2. Auto sign-in after successful registration
      setSuccess(true);
      const signInRes = await signIn('credentials', {
        email: email.trim().toLowerCase(),
        password,
        redirect: false,
      });

      if (signInRes?.error) {
        // Account created but auto-login failed — redirect to login
        router.push('/login?message=Account created! Please sign in.');
        return;
      }

      // 3. Redirect to dashboard
      router.push('/dashboard');
    } catch {
      setError('Network error. Please check your connection and try again.');
    }
    setLoading(false);
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="text-center max-w-md">
          <CheckCircle className="w-16 h-16 text-mkopa-green mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Account Created!</h1>
          <p className="text-gray-500 mb-6">Redirecting you to your dashboard...</p>
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-mkopa-green" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <Link href="/" className="inline-block">
            <h1 className="text-2xl font-bold"><span className="text-mkopa-green">M-Kopa</span> Loans</h1>
          </Link>
          <p className="text-gray-500 mt-1">Create your account</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm p-6 space-y-4">
          {error && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1">Full Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              minLength={2}
              className="w-full border rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-mkopa-green/30 focus:border-mkopa-green outline-none transition"
              placeholder="John Doe"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full border rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-mkopa-green/30 focus:border-mkopa-green outline-none transition"
              placeholder="you@email.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Phone Number (M-Pesa)</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              className="w-full border rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-mkopa-green/30 focus:border-mkopa-green outline-none transition"
              placeholder="+2547XXXXXXXX or 07XXXXXXXX"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full border rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-mkopa-green/30 focus:border-mkopa-green outline-none transition pr-10"
                placeholder="At least 6 characters"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Confirm Password</label>
            <input
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="w-full border rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-mkopa-green/30 focus:border-mkopa-green outline-none transition"
              placeholder="Repeat your password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full gradient-mkopa text-white py-2.5 rounded-lg font-semibold disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating Account...</> : 'Create Account'}
          </button>

          <p className="text-center text-sm text-gray-500 mt-3">
            Already have an account?{' '}
            <Link href="/login" className="text-mkopa-green font-semibold hover:underline">
              Sign In
            </Link>
          </p>
        </form>

        <p className="text-center text-xs text-gray-400 mt-4">
          By creating an account, you agree to M-Kopa Loans&apos; Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}
