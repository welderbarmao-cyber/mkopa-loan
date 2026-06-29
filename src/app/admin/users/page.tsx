'use client';

import { useState, useEffect } from 'react';
import { Loader2, Wallet, CheckCircle, Search } from 'lucide-react';
import { formatKES } from '@/lib/utils';

interface UserRecord {
  id: number;
  email: string;
  name: string;
  phone: string;
  role: string;
  kycStatus: string;
  loanLimit: number;
  loanLimitAssignedAt?: string;
  kycSubmittedAt?: string;
  kycReviewedAt?: string;
  createdAt: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [assigning, setAssigning] = useState<number | null>(null);
  const [limitInput, setLimitInput] = useState('');

  useEffect(() => { fetchUsers(); }, []);

  async function fetchUsers() {
    try {
      const res = await fetch('/api/admin/users');
      const data = await res.json();
      setUsers(data.records || []);
    } catch {}
    setLoading(false);
  }

  async function assignLimit(userId: number) {
    const limit = parseInt(limitInput);
    if (!limit || limit < 5000) {
      alert('Please enter a valid limit (min KES 5,000)');
      return;
    }
    setAssigning(userId);
    try {
      const res = await fetch('/api/admin/loan-limit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, loanLimit: limit }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Failed to assign limit');
        return;
      }
      setAssigning(null);
      setLimitInput('');
      await fetchUsers();
      alert(data.message);
    } catch {
      alert('Network error');
    }
    setAssigning(null);
  }

  const filtered = users.filter(u =>
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.phone.includes(search)
  );

  if (loading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-mkopa-green" /></div>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Users & Loan Limits</h1>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, email, or phone..."
          className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center">
          <p className="text-gray-500">No users found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(user => (
            <div key={user.id} className="bg-white rounded-xl p-5 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold">{user.name}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                      user.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {user.role}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                      user.kycStatus === 'approved' ? 'bg-green-100 text-green-700' :
                      user.kycStatus === 'submitted' ? 'bg-yellow-100 text-yellow-700' :
                      user.kycStatus === 'rejected' ? 'bg-red-100 text-red-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      KYC: {user.kycStatus}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500">{user.email} · {user.phone}</p>
                  <p className="text-xs text-gray-400 mt-1">Joined: {new Date(user.createdAt).toLocaleDateString()}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-mkopa-orange" />
                    <span className="text-sm">
                      Loan Limit: <strong>{user.loanLimit > 0 ? formatKES(user.loanLimit) : 'Not assigned'}</strong>
                    </span>
                  </div>
                </div>

                {/* Assign Loan Limit */}
                {user.kycStatus === 'approved' && user.role === 'customer' && (
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      placeholder="Limit (KES)"
                      value={assigning === user.id ? limitInput : ''}
                      min={5000}
                      max={500000}
                      onChange={(e) => {
                        setAssigning(user.id);
                        setLimitInput(e.target.value);
                      }}
                      className="w-32 border rounded-lg px-3 py-2 text-sm"
                    />
                    <button
                      onClick={() => assignLimit(user.id)}
                      disabled={assigning === user.id && !limitInput}
                      className="gradient-mkopa text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 disabled:opacity-40"
                    >
                      {assigning === user.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                      {user.loanLimit > 0 ? 'Update' : 'Assign'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
