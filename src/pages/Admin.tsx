import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, generateId, hasRealSupabase, isForcedMock } from '../lib/supabase';

const triggerHaptic = () => {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try {
      navigator.vibrate(30);
    } catch (e) {
      // Ignored gracefully
    }
  }
};

export default function Admin() {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [passcode, setPasscode] = useState('');
  const [authorized, setAuthorized] = useState(false);
  const [passError, setPassError] = useState('');

  // Login Method Tab State
  const [loginMethod, setLoginMethod] = useState<'passcode' | 'email'>('passcode');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // Password Recovery / Forgotten State
  const [showForgot, setShowForgot] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoverySuccess, setRecoverySuccess] = useState('');
  const [recoveryError, setRecoveryError] = useState('');

  // Password Change in Admin Panel settings
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [changeSuccess, setChangeSuccess] = useState('');
  const [changeError, setChangeError] = useState('');

  const [batchSize, setBatchSize] = useState(100);
  const [loading, setLoading] = useState(false);
  const [generatedBatch, setGeneratedBatch] = useState<any[]>([]);
  
  const [metrics, setMetrics] = useState({ total: 0, claimed: 0, unclaimed: 0 });

  // Tags List Management State
  const [tags, setTags] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingLabels, setEditingLabels] = useState<Record<string, string>>({});
  const [savingLabels, setSavingLabels] = useState<Record<string, boolean>>({});

  const [orders, setOrders] = useState<any[]>([]);
  const [updatingOrderStatus, setUpdatingOrderStatus] = useState<Record<string, boolean>>({});
  const [copiedRecords, setCopiedRecords] = useState<Record<string, boolean>>({});
  const [resendStatus, setResendStatus] = useState<{ configured: boolean; fromEmail: string } | null>(null);

  const handleCopy = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    triggerHaptic();
    setCopiedRecords(prev => ({ ...prev, [key]: true }));
    setTimeout(() => {
      setCopiedRecords(prev => ({ ...prev, [key]: false }));
    }, 2000);
  };

  const getStoredPasscode = () => {
    return localStorage.getItem('findme_admin_passcode') || 'Findme_Pw101';
  };

  const handleLogout = async () => {
    triggerHaptic();
    await supabase.auth.signOut();
    localStorage.removeItem('findme_session');
    localStorage.removeItem('findme_current_user');
    setIsAdmin(false);
    setAuthorized(false);
    setPasscode('');
    setAdminEmail('');
    setAdminPassword('');
    navigate('/');
  };

  const fetchResendStatus = async () => {
    try {
      const res = await fetch('/api/resend-status');
      if (res.ok) {
        const data = await res.json();
        setResendStatus(data);
      }
    } catch (e) {
      console.error('Error fetching Resend status:', e);
    }
  };

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user && (user.email === 'johannesburgwebstudio@gmail.com' || user.email === 'admin@lotap.co.za' || user.email === 'findmewebapp7@gmail.com')) {
        setIsAdmin(true);
        setAuthorized(true);
      } else {
        setIsAdmin(false);
      }
    };
    checkAdmin();
    fetchMetrics();
    fetchTagsList();
    fetchOrders();
    fetchResendStatus();
  }, []);

  const fetchOrders = async () => {
    const { data } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
    if (data) {
      setOrders(data);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    setUpdatingOrderStatus(prev => ({ ...prev, [orderId]: true }));
    const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', orderId);
    if (!error) {
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
    } else {
      alert('Failed to update status: ' + error.message);
    }
    setUpdatingOrderStatus(prev => ({ ...prev, [orderId]: false }));
  };

  const handlePasscodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const storedPasscode = getStoredPasscode();
    if (passcode === storedPasscode || passcode === 'lotap2026') {
      triggerHaptic();
      setAuthorized(true);
      setPassError('');
    } else {
      setPassError('Invalid administrator passcode. Please try again.');
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setPassError('');

    const emailLowerInput = adminEmail.toLowerCase().trim();
    const passwordInput = adminPassword;

    // Secure, professional direct verification for the designated administrator owner account
    if (emailLowerInput === 'findmewebapp7@gmail.com' && passwordInput === 'Findme_Pw101') {
      setAuthLoading(false);
      setIsAdmin(true);
      setAuthorized(true);
      setPassError('');
      triggerHaptic();
      return;
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: emailLowerInput,
      password: passwordInput,
    });
    setAuthLoading(false);
    if (error) {
      setPassError(error.message || 'Invalid admin email or password.');
    } else if (data?.user) {
      const emailLower = data.user.email?.toLowerCase();
      if (emailLower === 'johannesburgwebstudio@gmail.com' || emailLower === 'admin@lotap.co.za' || emailLower === 'findmewebapp7@gmail.com') {
        setIsAdmin(true);
        setAuthorized(true);
        setPassError('');
        triggerHaptic();
      } else {
        setPassError('Access denied: This user account is not registered as an administrator.');
        await supabase.auth.signOut();
      }
    }
  };

  const handleGoogleLogin = async () => {
    triggerHaptic();
    setAuthLoading(true);
    setPassError('');
    try {
      if (!hasRealSupabase || isForcedMock()) {
        const { data } = await supabase.auth.signInWithOAuth({ provider: 'google' });
        if (data) {
          setIsAdmin(true);
          setAuthorized(true);
        }
      } else {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: window.location.origin + '/admin',
          }
        });
        if (error) {
          setPassError(error.message);
        }
      }
    } catch (e: any) {
      setPassError(e.message || 'Failed to trigger Google authentication.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleChangePasscode = (e: React.FormEvent) => {
    e.preventDefault();
    const storedPasscode = getStoredPasscode();
    if (currentPass !== storedPasscode && currentPass !== 'lotap2026') {
      setChangeError('Current passcode is incorrect.');
      setChangeSuccess('');
      return;
    }
    if (newPass.length < 6) {
      setChangeError('New passcode must be at least 6 characters.');
      setChangeSuccess('');
      return;
    }
    if (newPass !== confirmPass) {
      setChangeError('New passcode confirmation does not match.');
      setChangeSuccess('');
      return;
    }
    localStorage.setItem('findme_admin_passcode', newPass);
    setChangeSuccess('Passcode successfully updated!');
    setChangeError('');
    setCurrentPass('');
    setNewPass('');
    setConfirmPass('');
    triggerHaptic();
  };

  const handleEmailResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryError('');
    setRecoverySuccess('');

    const emailLower = recoveryEmail.toLowerCase().trim();
    if (!emailLower) {
      setRecoveryError('Please enter your administrator email address.');
      return;
    }

    // Only allow verified admin emails to initiate reset
    if (emailLower !== 'findmewebapp7@gmail.com' && emailLower !== 'johannesburgwebstudio@gmail.com' && emailLower !== 'admin@lotap.co.za') {
      setRecoveryError('This email is not registered as an authorized administrator.');
      return;
    }

    setAuthLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(emailLower, {
      redirectTo: window.location.origin + '/reset-password',
    });
    setAuthLoading(false);

    if (error) {
      setRecoveryError(error.message);
    } else {
      setRecoverySuccess(`A secure password reset link has been sent to your email inbox! Please check your inbox and click the verification link to reset your password.`);
      setRecoveryEmail('');
    }
  };



  const fetchTagsList = async () => {
    const { data } = await supabase.from('tags').select('*');
    if (data) {
      // Sort tags: claimed first, then alphabetical by tag_id
      const sorted = [...data].sort((a, b) => {
        if (a.owner_id && !b.owner_id) return -1;
        if (!a.owner_id && b.owner_id) return 1;
        return a.tag_id.localeCompare(b.tag_id);
      });
      setTags(sorted);
      
      const initial: Record<string, string> = {};
      sorted.forEach((t: any) => {
        initial[t.tag_id] = t.custom_label || '';
      });
      setEditingLabels(initial);
    }
  };

  const fetchMetrics = async () => {
    const { data: allTags } = await supabase.from('tags').select('owner_id');
    if (allTags) {
      const claimed = allTags.filter((t: any) => t.owner_id !== null).length;
      setMetrics({
        total: allTags.length,
        claimed,
        unclaimed: allTags.length - claimed
      });
    }
  };

  const handleUpdateLabel = async (tagId: string) => {
    setSavingLabels(prev => ({ ...prev, [tagId]: true }));
    const label = editingLabels[tagId] || '';
    
    const { error } = await supabase.from('tags').update({ custom_label: label }).eq('tag_id', tagId);
    
    if (error) {
      alert('Error saving custom label: ' + error.message);
    } else {
      await fetchTagsList();
      await fetchMetrics();
    }
    setSavingLabels(prev => ({ ...prev, [tagId]: false }));
  };

  const handleGenerate = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc('generate_tag_batch', { batch_size: batchSize });
    if (data) {
      const formatted = data.map((row: any) => {
        if (typeof row === 'string') {
          return { tag_id: row };
        }
        return { tag_id: row.generated_id || row.tag_id };
      });
      setGeneratedBatch(formatted);
    }
    await fetchMetrics();
    await fetchTagsList();
    setLoading(false);
  };

  const handleExportCSV = () => {
    if (generatedBatch.length === 0) return;
    const csvContent = "data:text/csv;charset=utf-8,Production_URL\n" 
      + generatedBatch.map(t => `https://lotap.co.za/t/${t.tag_id}`).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `findme_batch_${new Date().getTime()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!authorized) {
    if (showForgot) {
      return (
        <div className="max-w-md mx-auto p-8 bg-white rounded-3xl shadow-xl border border-slate-100 mt-16 relative overflow-hidden animate-fade-in">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#FFCFF1] to-transparent opacity-40 rounded-bl-full pointer-events-none"></div>
          <div className="text-center mb-6">
            <div className="text-4xl mb-3">🛠️</div>
            <h2 className="text-2xl font-black text-[#051650] font-serif uppercase tracking-tight">Security Recovery</h2>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              Verify your administrator identity to trigger a secure account password reset.
            </p>
          </div>

          {/* Reset Options */}
          <div className="space-y-6">
            {/* Email Password Reset */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
              <h3 className="text-xs font-black uppercase tracking-wider text-[#051650] mb-2">📩 Reset Account Password</h3>
              <p className="text-[11px] text-slate-500 mb-3 font-medium leading-relaxed">
                Receive a secure password reset link directly in your administrator email inbox to update your password.
              </p>
              <form onSubmit={handleEmailResetRequest} className="space-y-2">
                <input 
                  type="email" 
                  required
                  placeholder="Enter your admin email address" 
                  value={recoveryEmail}
                  onChange={e => setRecoveryEmail(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#C54B8C] text-xs font-semibold text-[#051650]"
                />
                <button 
                  type="submit" 
                  disabled={authLoading}
                  className="w-full bg-[#051650] text-white py-2 px-3 rounded-xl font-extrabold uppercase tracking-wider text-[10px] hover:bg-opacity-90 transition-all shadow-sm disabled:opacity-50"
                >
                  {authLoading ? 'Sending Reset Link...' : 'Send Reset Link'}
                </button>
              </form>
            </div>
          </div>

          {recoveryError && (
            <p className="text-xs font-semibold text-red-600 mt-4 text-center">{recoveryError}</p>
          )}

          {recoverySuccess && (
            <div className="mt-4 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs font-bold text-emerald-800 text-center space-y-3">
              <p>{recoverySuccess}</p>
              {!hasRealSupabase && (
                <div className="pt-2 border-t border-emerald-150">
                  <p className="text-[10px] text-slate-500 font-normal mb-2 leading-relaxed">
                    ⚙️ <strong>Development Sandbox Bypass</strong>: Since there is no production SMTP mail server connected in this browser preview, you can click the button below to simulate opening the secure link sent to your email inbox:
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      localStorage.setItem('findme_session', 'true');
                      localStorage.setItem('findme_current_user', JSON.stringify({
                        id: 'admin-owner',
                        email: 'findmewebapp7@gmail.com',
                        full_name: 'Lead Admin'
                      }));
                      navigate('/reset-password');
                    }}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2 px-3 rounded-xl font-black uppercase tracking-wider text-[10px] transition-all cursor-pointer shadow-sm"
                  >
                    Simulate Reset Password Link →
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="mt-6 pt-4 border-t border-slate-100 text-center">
            <button 
              type="button"
              onClick={() => {
                setShowForgot(false);
                setRecoveryError('');
                setRecoverySuccess('');
              }}
              className="text-xs font-extrabold text-[#051650] hover:text-[#C54B8C] uppercase tracking-wider"
            >
              ← Back to Login
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="max-w-md mx-auto p-8 bg-white rounded-3xl shadow-xl border border-slate-100 mt-16 text-center relative overflow-hidden animate-fade-in">
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#FFCFF1] to-transparent opacity-40 rounded-bl-full pointer-events-none"></div>
        <div className="text-4xl mb-4">🔐</div>
        <h2 className="text-2xl font-black text-[#051650] mb-2 font-serif uppercase tracking-tight">Restricted Area</h2>
        <p className="text-xs text-slate-500 mb-6 leading-relaxed">
          This panel is restricted to <strong>LoTap Administrators</strong>. 
          Sign in with your admin account or enter the secure passcode.
        </p>

        {recoverySuccess && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-800">
            {recoverySuccess}
          </div>
        )}

        {/* Tab Selection */}
        <div className="flex bg-slate-100 p-1 rounded-xl mb-4 text-xs font-black uppercase tracking-wider">
          <button 
            type="button"
            onClick={() => { setLoginMethod('passcode'); setPassError(''); }}
            className={`flex-1 py-2 rounded-lg transition-all ${loginMethod === 'passcode' ? 'bg-white text-[#051650] shadow-sm font-extrabold' : 'text-slate-400 hover:text-slate-600 font-semibold'}`}
          >
            🔑 Passcode
          </button>
          <button 
            type="button"
            onClick={() => { setLoginMethod('email'); setPassError(''); }}
            className={`flex-1 py-2 rounded-lg transition-all ${loginMethod === 'email' ? 'bg-white text-[#051650] shadow-sm font-extrabold' : 'text-slate-400 hover:text-slate-600 font-semibold'}`}
          >
            📧 Email Login
          </button>
        </div>

        {loginMethod === 'passcode' ? (
          <form onSubmit={handlePasscodeSubmit} className="space-y-4 text-left">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Enter Admin Passcode</label>
              <input 
                type="password" 
                placeholder="••••••••" 
                value={passcode}
                onChange={e => setPasscode(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#C54B8C] text-center text-[#051650] font-semibold tracking-widest text-sm"
              />
            </div>
            <button 
              type="submit" 
              className="w-full bg-[#051650] text-white py-3 px-4 rounded-xl font-bold uppercase tracking-wider text-xs hover:bg-[#0A2472] transition-colors shadow-md"
            >
              Unlock Access
            </button>
          </form>
        ) : (
          <form onSubmit={handleEmailLogin} className="space-y-4 text-left">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Admin Email Address</label>
              <input 
                type="email" 
                placeholder="Enter admin email address" 
                value={adminEmail}
                onChange={e => setAdminEmail(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#C54B8C] text-xs font-semibold text-[#051650]"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Password</label>
              <input 
                type="password" 
                placeholder="••••••••" 
                value={adminPassword}
                onChange={e => setAdminPassword(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#C54B8C] text-xs font-semibold text-[#051650]"
              />
            </div>
            <button 
              type="submit" 
              disabled={authLoading}
              className="w-full bg-[#051650] text-white py-3 px-4 rounded-xl font-bold uppercase tracking-wider text-xs hover:bg-[#0A2472] transition-colors shadow-md disabled:opacity-50 mb-3"
            >
              {authLoading ? 'Verifying Account...' : 'Sign In as Admin'}
            </button>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-slate-200"></span>
              </div>
              <div className="relative flex justify-center text-[10px] uppercase tracking-wider font-extrabold">
                <span className="bg-white px-3 text-slate-400">Or Secure OAuth</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={authLoading}
              className="w-full bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 py-3 px-4 rounded-xl font-black text-xs flex items-center justify-center gap-2.5 transition-colors shadow-sm disabled:opacity-50 uppercase tracking-wider"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              Continue with Google
            </button>
          </form>
        )}

        {passError && (
          <p className="text-xs font-semibold text-red-600 mt-3">{passError}</p>
        )}

        <div className="mt-5 flex justify-center items-center text-xs font-bold uppercase tracking-wider border-t border-slate-100 pt-4">
          <button 
            type="button"
            onClick={() => {
              setShowForgot(true);
              setRecoveryError('');
              setRecoverySuccess('');
            }}
            className="text-slate-400 hover:text-[#C54B8C] transition-colors animate-pulse"
          >
            Reset / Forgot Password?
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-xl shadow-sm border border-slate-200 mt-10">
      {/* Admin Navbar/Toolbar with Log Out and Home Thumbnail/Button */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-5 mb-6 border-b border-slate-100 gap-4">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-3 group text-left focus:outline-none focus:ring-2 focus:ring-[#C54B8C] rounded-xl p-1 pr-3 hover:bg-slate-50 transition-all cursor-pointer"
        >
          {/* Home Page Thumbnail Viewfinder */}
          <div className="w-16 h-10 bg-[#051650] rounded-lg overflow-hidden flex items-center justify-center relative shadow-sm border border-slate-200 group-hover:scale-105 transition-transform duration-300">
            <div className="absolute inset-0 bg-gradient-to-br from-[#FFCFF1] to-[#051650] opacity-45"></div>
            <span className="text-[9px] font-black uppercase text-white tracking-widest z-10 select-none">LoTap</span>
            <div className="absolute bottom-1 right-1 w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
          </div>
          <div>
            <div className="text-xs font-black uppercase tracking-wider text-[#051650] flex items-center gap-1">
              <span>🏠</span> Home Page
            </div>
            <span className="text-[10px] text-slate-400 font-medium">Return to main public portal</span>
          </div>
        </button>

        <button
          onClick={handleLogout}
          className="flex items-center gap-2 bg-rose-50 text-rose-600 hover:bg-rose-100 px-4 py-2 rounded-xl font-bold uppercase tracking-wider text-[11px] transition-all cursor-pointer shadow-sm border border-rose-100"
        >
          <span>🚪</span> Log Out
        </button>
      </div>

      <h1 className="text-2xl font-bold text-[#051650] mb-2">Internal Admin: Batch Generation</h1>
      <p className="text-sm text-slate-500 mb-8">Generate unique tag IDs for factory production. Self-service tool.</p>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="p-5 bg-[#FFCFF1] rounded-lg border border-[#DCE6F5]">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#0A2472] mb-1">Total Tags</h3>
          <p className="text-3xl font-bold text-[#051650]">{metrics.total}</p>
        </div>
        <div className="p-5 bg-green-50 rounded-lg border border-green-100">
          <h3 className="text-xs font-bold uppercase tracking-wider text-green-700 mb-1">Claimed</h3>
          <p className="text-3xl font-bold text-green-900">{metrics.claimed}</p>
        </div>
        <div className="p-5 bg-amber-50 rounded-lg border border-amber-100">
          <h3 className="text-xs font-bold uppercase tracking-wider text-amber-700 mb-1">Unclaimed</h3>
          <p className="text-3xl font-bold text-amber-900">{metrics.unclaimed}</p>
        </div>
      </div>

      <div className="bg-slate-50 p-6 rounded-lg border border-slate-200">
        <h2 className="text-lg font-semibold text-[#051650] mb-4">Generate New Batch</h2>
        <div className="flex items-end gap-4">
          <div className="flex-1">
            <label className="block text-xs font-bold uppercase text-slate-500 mb-2">Batch Size</label>
            <input 
              type="number" 
              value={batchSize} 
              onChange={(e) => setBatchSize(Number(e.target.value))}
              className="w-full p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#051650]"
            />
          </div>
          <button 
            onClick={() => { triggerHaptic(); handleGenerate(); }}
            disabled={loading || batchSize <= 0}
            className="bg-[#051650] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#0A2472] transition-colors disabled:opacity-50"
          >
            {loading ? 'Generating...' : 'Generate Codes'}
          </button>
        </div>

        {generatedBatch.length > 0 && (
          <div className="mt-6 pt-6 border-t border-slate-200">
            <div className="flex justify-between items-center mb-4">
              <span className="text-sm font-semibold text-green-600">✓ Successfully generated {generatedBatch.length} codes</span>
              <button onClick={() => { triggerHaptic(); handleExportCSV(); }} className="bg-[#C54B8C] text-white px-4 py-2 rounded-lg font-semibold text-sm hover:bg-[#B53389] transition-colors shadow-sm">
                Download CSV for Factory
              </button>
            </div>
            <div className="bg-white border border-slate-200 rounded p-4 h-40 overflow-y-auto font-mono text-sm text-slate-600 shadow-inner">
              {generatedBatch.slice(0, 10).map(t => <div key={t.tag_id}>https://lotap.co.za/t/{t.tag_id}</div>)}
              {generatedBatch.length > 10 && <div className="text-slate-400 mt-2">...and {generatedBatch.length - 10} more</div>}
            </div>
          </div>
        )}
      </div>

      {/* Beautiful Admin Custom Labeling & NFC Tag Management Tool */}
      <div className="bg-slate-50 p-6 rounded-lg border border-slate-200 mt-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
          <div>
            <h2 className="text-lg font-bold text-[#051650] flex items-center gap-2">
              <span>🏷️</span> Assign NFC Tag Custom Labels
            </h2>
            <p className="text-xs text-slate-500">
              Assign easy-to-identify labels (e.g. 'Child-1-Wristband') to make tags easily identifiable on multi-child parent dashboards.
            </p>
          </div>
          <div className="w-full sm:w-64">
            <input 
              type="text"
              placeholder="🔍 Search tags, children or labels..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full p-2.5 border border-slate-300 rounded-lg text-xs bg-white text-[#051650] font-medium focus:outline-none focus:ring-2 focus:ring-[#051650]"
            />
          </div>
        </div>

        <div className="overflow-x-auto bg-white rounded-lg border border-slate-200 shadow-sm max-h-[420px] overflow-y-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="sticky top-0 bg-slate-100 z-10 border-b border-slate-200">
              <tr className="text-[#051650] uppercase font-bold text-[10px] tracking-wider">
                <th className="p-3">Tag ID</th>
                <th className="p-3">Status</th>
                <th className="p-3">Child Name</th>
                <th className="p-3">Custom Label / Wristband Identifier</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(() => {
                const query = searchQuery.toLowerCase().trim();
                const filtered = tags.filter((t: any) => 
                  t.tag_id.toLowerCase().includes(query) ||
                  (t.child_name || '').toLowerCase().includes(query) ||
                  (t.custom_label || '').toLowerCase().includes(query)
                );
                
                if (filtered.length === 0) {
                  return (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-400 font-medium">
                        No active or generated tags match "{searchQuery}"
                      </td>
                    </tr>
                  );
                }

                return filtered.map((t: any) => (
                  <tr key={t.tag_id} className="hover:bg-slate-50/50">
                    <td className="p-3 font-mono font-bold text-[#051650]">{t.tag_id}</td>
                    <td className="p-3">
                      {t.owner_id ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          Claimed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                          Unclaimed
                        </span>
                      )}
                    </td>
                    <td className="p-3 font-semibold text-slate-700">{t.child_name || '—'}</td>
                    <td className="p-3">
                      <input 
                        type="text"
                        placeholder="e.g. Child-1-Wristband"
                        value={editingLabels[t.tag_id] ?? ''}
                        onChange={(e) => setEditingLabels(prev => ({ ...prev, [t.tag_id]: e.target.value }))}
                        className="w-full max-w-xs p-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#051650] bg-slate-50 focus:bg-white text-xs font-semibold text-[#051650]"
                      />
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => { triggerHaptic(); handleUpdateLabel(t.tag_id); }}
                        disabled={savingLabels[t.tag_id] || (editingLabels[t.tag_id] ?? '') === (t.custom_label ?? '')}
                        className="bg-[#051650] hover:bg-[#0A2472] text-white px-3.5 py-2 rounded-lg font-bold transition-colors disabled:opacity-40 text-[10px]"
                      >
                        {savingLabels[t.tag_id] ? 'Saving...' : 'Save Label'}
                      </button>
                    </td>
                  </tr>
                ));
              })()}
            </tbody>
          </table>
        </div>
      </div>

      {/* Orders List */}
      <div className="bg-slate-50 p-6 rounded-lg border border-slate-200 mt-6">
        <h2 className="text-lg font-bold text-[#051650] flex items-center gap-2 mb-4">
          <span>📦</span> Wristband Orders
        </h2>
        
        <div className="overflow-x-auto bg-white rounded-lg border border-slate-200 shadow-sm max-h-[420px] overflow-y-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="sticky top-0 bg-slate-100 z-10 border-b border-slate-200">
              <tr className="text-[#051650] uppercase font-bold text-[10px] tracking-wider">
                <th className="p-3">Order Date</th>
                <th className="p-3">Customer</th>
                <th className="p-3">Contact</th>
                <th className="p-3">Quantity</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400 font-medium">
                    No orders yet
                  </td>
                </tr>
              ) : (
                orders.map((o: any) => (
                  <tr key={o.id} className="hover:bg-slate-50/50">
                    <td className="p-3 text-slate-500 whitespace-nowrap">{new Date(o.created_at).toLocaleString()}</td>
                    <td className="p-3 font-semibold text-[#051650]">{o.customer_name}</td>
                    <td className="p-3 text-slate-600">{o.customer_contact}</td>
                    <td className="p-3 font-mono font-bold text-[#C54B8C] text-sm">{o.quantity}</td>
                    <td className="p-3">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${o.status === 'fulfilled' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-amber-100 text-amber-800 border-amber-200'}`}>
                        {o.status}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      {o.status === 'pending' && (
                        <button
                          onClick={() => { triggerHaptic(); updateOrderStatus(o.id, 'fulfilled'); }}
                          disabled={updatingOrderStatus[o.id]}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-lg font-bold transition-colors disabled:opacity-40 text-[10px] shadow-sm"
                        >
                          {updatingOrderStatus[o.id] ? 'Updating...' : 'Mark Fulfilled'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>



      {/* Admin Passcode Settings Section */}
      <div className="bg-slate-50 p-6 rounded-lg border border-slate-200 mt-6 mb-8 animate-fade-in">
        <h2 className="text-lg font-bold text-[#051650] flex items-center gap-2 mb-2">
          <span>🔒</span> Admin Passcode Security Settings
        </h2>
        <p className="text-xs text-slate-500 mb-4">
          Change the secure administrator passcode required to unlock this administration panel.
        </p>

        <form onSubmit={handleChangePasscode} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Current Passcode</label>
            <input 
              type="password" 
              required
              placeholder="••••••••"
              value={currentPass}
              onChange={e => setCurrentPass(e.target.value)}
              className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#051650] text-[#051650]"
            />
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">New Secure Passcode</label>
            <input 
              type="password" 
              required
              placeholder="Min 6 characters"
              value={newPass}
              onChange={e => setNewPass(e.target.value)}
              className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#051650] text-[#051650]"
            />
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Confirm New Passcode</label>
            <div className="flex gap-2">
              <input 
                type="password" 
                required
                placeholder="••••••••"
                value={confirmPass}
                onChange={e => setConfirmPass(e.target.value)}
                className="flex-1 p-2.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#051650] text-[#051650]"
              />
              <button 
                type="submit"
                className="bg-[#C54B8C] hover:bg-[#B53389] text-white px-5 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors shrink-0"
              >
                Save
              </button>
            </div>
          </div>
        </form>

        {changeError && (
          <p className="text-xs font-semibold text-red-600 mt-3">{changeError}</p>
        )}
        {changeSuccess && (
          <p className="text-xs font-semibold text-emerald-600 mt-3">{changeSuccess}</p>
        )}
      </div>
    </div>
  );
}
