import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ShieldAlert, Key, HelpCircle } from 'lucide-react';

export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loginMethod, setLoginMethod] = useState<'passcode' | 'email'>('passcode');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [passcode, setPasscode] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  
  const navigate = useNavigate();

  const adminEmails = [
    'johannesburgwebstudio@gmail.com',
    'admin@lotap.co.za',
    'findmewebapp7@gmail.com'
  ];

  const checkAdminSession = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        const email = session.user?.email?.toLowerCase() || '';
        if (adminEmails.includes(email)) {
          setAuthorized(true);
          setLoading(false);
          return;
        }
      }
      
      // Also check local session fallback
      const localUser = localStorage.getItem('findme_current_user');
      if (localUser) {
        const parsed = JSON.parse(localUser);
        const email = parsed.email?.toLowerCase() || '';
        if (adminEmails.includes(email)) {
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

  const handlePasscodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError('');
    
    const storedPasscode = localStorage.getItem('findme_admin_passcode') || 'Findme_Pw101';
    if (passcode === storedPasscode || passcode === 'lotap2026' || passcode === 'Findme_Pw101') {
      localStorage.setItem('findme_session', 'true');
      localStorage.setItem('findme_current_user', JSON.stringify({
        id: 'admin-owner',
        email: 'findmewebapp7@gmail.com',
        full_name: 'Lead Admin'
      }));
      setAuthorized(true);
    } else {
      setAuthError('Invalid administrator passcode. Please try again.');
    }
    setAuthLoading(false);
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError('');

    const emailLowerInput = adminEmail.toLowerCase().trim();
    const passwordInput = adminPassword;

    if (emailLowerInput === 'findmewebapp7@gmail.com' && passwordInput === 'Findme_Pw101') {
      localStorage.setItem('findme_session', 'true');
      localStorage.setItem('findme_current_user', JSON.stringify({
        id: 'admin-owner',
        email: emailLowerInput,
        full_name: 'Lead Admin'
      }));
      setAuthorized(true);
      setAuthLoading(false);
      return;
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: emailLowerInput,
      password: passwordInput,
    });

    if (error) {
      setAuthError(error.message || 'Invalid admin email or password.');
    } else if (data?.user) {
      const emailLower = data.user.email?.toLowerCase();
      if (adminEmails.includes(emailLower || '')) {
        setAuthorized(true);
      } else {
        setAuthError('Access denied: This user account is not registered as an administrator.');
        await supabase.auth.signOut();
      }
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
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#C54B8C]/10 to-transparent opacity-50 rounded-bl-full pointer-events-none"></div>
          
          <div className="text-center mb-6">
            <div className="w-12 h-12 bg-[#051650]/5 text-[#051650] flex items-center justify-center rounded-2xl mx-auto mb-3 border border-[#051650]/10">
              <Key className="w-5 h-5 text-[#C54B8C]" />
            </div>
            <h2 className="text-xl font-black text-[#051650] uppercase tracking-tight">Restricted Area</h2>
            <p className="text-xs text-neutral-500 mt-2 leading-relaxed">
              This panel is restricted to LoTap Administrators. Sign in with your admin account or enter the secure passcode.
            </p>
          </div>

          {/* Login Method Tab Switcher */}
          <div className="flex bg-neutral-100 p-1 rounded-xl mb-6 text-[11px] font-bold uppercase tracking-wider">
            <button 
              type="button"
              onClick={() => { setLoginMethod('passcode'); setAuthError(''); }}
              className={`flex-1 py-2.5 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${loginMethod === 'passcode' ? 'bg-white text-[#051650] shadow-sm font-black' : 'text-neutral-400 hover:text-neutral-600'}`}
            >
              🔑 Passcode
            </button>
            <button 
              type="button"
              onClick={() => { setLoginMethod('email'); setAuthError(''); }}
              className={`flex-1 py-2.5 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${loginMethod === 'email' ? 'bg-white text-[#051650] shadow-sm font-black' : 'text-neutral-400 hover:text-neutral-600'}`}
            >
              📧 Email Login
            </button>
          </div>

          {loginMethod === 'passcode' && (
            <form onSubmit={handlePasscodeSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-neutral-500 mb-1.5">Enter Admin Passcode</label>
                <input 
                  type="password" 
                  placeholder="••••••••" 
                  value={passcode}
                  onChange={e => setPasscode(e.target.value)}
                  className="w-full p-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#C54B8C] text-center text-[#051650] font-semibold tracking-widest text-sm"
                  required
                />
              </div>
              
              <button 
                type="submit" 
                disabled={authLoading}
                className="w-full bg-[#051650] text-white py-3 px-4 rounded-xl font-bold uppercase tracking-wider text-xs hover:bg-[#0A2472] transition-colors shadow-md cursor-pointer disabled:opacity-50"
              >
                {authLoading ? 'Verifying...' : 'Unlock Access'}
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => setShowResetModal(true)}
                  className="text-[10px] font-bold text-neutral-400 hover:text-[#C54B8C] uppercase tracking-wider transition-colors"
                >
                  Reset / Forgot Password?
                </button>
              </div>
            </form>
          )}

          {loginMethod === 'email' && (
            <form onSubmit={handleEmailLogin} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-neutral-500 mb-1.5">Admin Email Address</label>
                <input 
                  type="email" 
                  placeholder="Enter admin email address" 
                  value={adminEmail}
                  onChange={e => setAdminEmail(e.target.value)}
                  className="w-full p-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#C54B8C] text-xs font-semibold text-[#051650]"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-neutral-500 mb-1.5">Password</label>
                <input 
                  type="password" 
                  placeholder="••••••••" 
                  value={adminPassword}
                  onChange={e => setAdminPassword(e.target.value)}
                  className="w-full p-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#C54B8C] text-xs font-semibold text-[#051650]"
                  required
                />
              </div>

              <button 
                type="submit" 
                disabled={authLoading}
                className="w-full bg-[#051650] text-white py-3 px-4 rounded-xl font-bold uppercase tracking-wider text-xs hover:bg-[#0A2472] transition-colors shadow-md cursor-pointer disabled:opacity-50"
              >
                {authLoading ? 'Verifying...' : 'Sign In as Admin'}
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => setShowResetModal(true)}
                  className="text-[10px] font-bold text-neutral-400 hover:text-[#C54B8C] uppercase tracking-wider transition-colors"
                >
                  Reset / Forgot Password?
                </button>
              </div>
            </form>
          )}

          {authError && (
            <div className="text-xs font-semibold text-red-600 mt-4 text-center bg-red-50 p-3 rounded-xl border border-red-100 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-red-500 shrink-0" />
              <p className="flex-1 text-left leading-normal">{authError}</p>
            </div>
          )}

          <div className="mt-6 pt-4 border-t border-neutral-100 text-center">
            <button 
              type="button"
              onClick={() => navigate('/')}
              className="text-[10px] font-black text-neutral-400 hover:text-[#C54B8C] uppercase tracking-wider transition-colors"
            >
              ← Return to Homepage
            </button>
          </div>
        </div>

        {/* RESET PASSWORD INFO MODAL */}
        {showResetModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-neutral-100 animate-fade-in text-center">
              <div className="w-12 h-12 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <HelpCircle className="w-6 h-6 text-neutral-500" />
              </div>
              <h3 className="font-bold text-sm text-neutral-900 uppercase tracking-tight">System Account Recovery</h3>
              <p className="text-xs text-neutral-500 mt-2 leading-relaxed">
                To reset your passcode or change password credentials, please contact the lead systems engineer directly or submit a credential recovery request to:
              </p>
              <p className="text-xs font-mono font-bold text-[#051650] mt-3 bg-neutral-50 p-2.5 rounded-xl border border-neutral-100 select-all">
                admin@lotap.co.za
              </p>
              <button
                type="button"
                onClick={() => setShowResetModal(false)}
                className="mt-5 w-full bg-neutral-900 hover:bg-neutral-800 text-white text-[10px] font-black uppercase tracking-wider py-2.5 rounded-xl transition-all"
              >
                Got it
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return <>{children}</>;
}
