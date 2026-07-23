import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ShieldAlert, Key } from 'lucide-react';

export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [adminEmail, setAdminEmail] = useState('findmewebapp7@gmail.com');
  const [adminPassword, setAdminPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  const navigate = useNavigate();

  const ADMIN_EMAILS = [
    'findmewebapp7@gmail.com',
    'johannesburgwebstudio@gmail.com',
    'admin@lotap.co.za'
  ];

  const checkAdminSession = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const email = session.user.email?.toLowerCase() || '';
        let isAdmin = false;
        try {
          const { data } = await supabase.rpc('is_admin');
          isAdmin = !!data;
        } catch {
          // RPC may fail if custom function isn't in SQL schema yet
        }

        if (isAdmin || ADMIN_EMAILS.includes(email)) {
          setAuthorized(true);
          setLoading(false);
          return;
        }
      }
    } catch (e) {
      console.error('Error checking admin session:', e);
    }
    setLoading(false);
  };

  useEffect(() => {
    checkAdminSession();
  }, []);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError('');

    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email: adminEmail.trim(),
      password: adminPassword,
    });

    if (error || !authData.user) {
      setAuthError(error?.message || 'Invalid admin email or password.');
      setAuthLoading(false);
      return;
    }

    const email = authData.user.email?.toLowerCase() || '';
    let isAdmin = false;
    try {
      const { data } = await supabase.rpc('is_admin');
      isAdmin = !!data;
    } catch (err) {
      console.warn("is_admin RPC check warning:", err);
    }

    if (isAdmin || ADMIN_EMAILS.includes(email)) {
      setAuthorized(true);
    } else {
      setAuthError('Access denied: this account is not registered as an administrator.');
      await supabase.auth.signOut();
    }
    setAuthLoading(false);
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#FDFBF7]">
        <p className="text-xs uppercase tracking-widest text-neutral-400 font-bold animate-pulse">
          Verifying administrative credentials...
        </p>
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FDFBF7] p-6 relative">
        <div className="max-w-md w-full p-8 bg-white border border-neutral-200 rounded-3xl shadow-xl relative overflow-hidden">
          <div className="text-center mb-6">
            <div className="w-12 h-12 bg-[#051650]/5 text-[#051650] flex items-center justify-center rounded-2xl mx-auto mb-3 border border-[#051650]/10">
              <Key className="w-5 h-5 text-[#C54B8C]" />
            </div>
            <h2 className="text-xl font-black text-[#051650] uppercase tracking-tight">Restricted Area</h2>
            <p className="text-xs text-neutral-500 mt-2 leading-relaxed">
              Sign in with your registered administrator account.
            </p>
          </div>

          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-neutral-500 mb-1.5">Admin Email Address</label>
              <input
                type="email"
                required
                value={adminEmail}
                onChange={e => setAdminEmail(e.target.value)}
                className="w-full p-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#C54B8C] text-xs font-semibold text-[#051650]"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-neutral-500 mb-1.5">Password</label>
              <input
                type="password"
                required
                value={adminPassword}
                onChange={e => setAdminPassword(e.target.value)}
                className="w-full p-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#C54B8C] text-xs font-semibold text-[#051650]"
              />
            </div>
            <button
              type="submit"
              disabled={authLoading}
              className="w-full bg-[#051650] text-white py-3 px-4 rounded-xl font-bold uppercase tracking-wider text-xs hover:bg-[#0A2472] transition-colors shadow-md disabled:opacity-50"
            >
              {authLoading ? 'Verifying...' : 'Sign In as Admin'}
            </button>
          </form>

          {authError && (
            <div className="text-xs font-semibold text-red-600 mt-4 text-center bg-red-50 p-3 rounded-xl border border-red-100 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-red-500 shrink-0" />
              <p className="flex-1 text-left leading-normal">{authError}</p>
            </div>
          )}

          <div className="mt-6 pt-4 border-t border-neutral-100 text-center">
            <button type="button" onClick={() => navigate('/')} className="text-[10px] font-black text-neutral-400 hover:text-[#C54B8C] uppercase tracking-wider transition-colors">
              ← Return to Homepage
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
