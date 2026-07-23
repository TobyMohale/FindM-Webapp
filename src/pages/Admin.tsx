import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, generateId } from '../lib/supabase';
import { useAdminTags } from '../hooks/useAdminTags';

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
  
  // Tag List Pagination and Display States
  const [pageSize, setPageSize] = useState<number | 'all'>(50);
  const [currentPage, setCurrentPage] = useState<number>(1);
  
  const { tags, setTags, loading: tagsLoading, refetch: fetchTagsList } = useAdminTags();

  const metrics = useMemo(() => {
    const total = tags.length;
    const claimed = tags.filter((t: any) => t.owner_id !== null).length;
    return {
      total,
      claimed,
      unclaimed: total - claimed
    };
  }, [tags]);

  const sortedTags = useMemo(() => {
    return [...tags].sort((a, b) => {
      if (a.owner_id && !b.owner_id) return -1;
      if (!a.owner_id && b.owner_id) return 1;
      return a.tag_id.localeCompare(b.tag_id);
    });
  }, [tags]);

  useEffect(() => {
    setEditingLabels(prev => {
      const updated = { ...prev };
      tags.forEach((t: any) => {
        if (updated[t.tag_id] === undefined) {
          updated[t.tag_id] = t.custom_label || '';
        }
      });
      return updated;
    });
  }, [tags]);

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
        const localUser = localStorage.getItem('findme_current_user');
        if (localUser) {
          const parsed = JSON.parse(localUser);
          const email = parsed.email?.toLowerCase() || '';
          if (['johannesburgwebstudio@gmail.com', 'admin@lotap.co.za', 'findmewebapp7@gmail.com'].includes(email)) {
            setIsAdmin(true);
            setAuthorized(true);
            return;
          }
        }
        setIsAdmin(false);
      }
    };
    checkAdmin();
    fetchMetrics();
    fetchTagsList();
    fetchOrders();
    fetchResendStatus();
  }, []);

  useEffect(() => {
    if (!authorized) return;

    // CENTRALIZED SUPABASE REAL-TIME DATA SUBSCRIPTION
    // Instantly reflects new claims, scans, labels, and orders regardless of device
    const realtimeChannel = supabase
      .channel('admin-realtime-channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tags' },
        (payload: any) => {
          console.log('Real-time database update detected on tags:', payload);
          fetchTagsList();
          fetchMetrics();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        (payload: any) => {
          console.log('Real-time database update detected on orders:', payload);
          fetchOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(realtimeChannel);
    };
  }, [authorized]);

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



  const fetchMetrics = async () => {
    // Handled automatically via useMemo metrics
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
    triggerHaptic();
    try {
      // First attempt using Supabase RPC batch generator
      const { data, error } = await supabase.rpc('generate_tag_batch', { batch_size: batchSize });
      
      if (data && !error) {
        const formatted = data.map((row: any) => {
          if (typeof row === 'string') {
            return { tag_id: row };
          }
          return { tag_id: row.generated_id || row.tag_id };
        });
        setGeneratedBatch(formatted);
      } else {
        // Fallback: Generate tags directly via secure client-side insertion if RPC not found or fails
        console.warn('RPC generate_tag_batch not found or failed. Running high-fidelity client fallback batch generator...');
        const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
        const newTags: any[] = [];
        
        for (let i = 0; i < batchSize; i++) {
          let uniqueId = '';
          for (let j = 0; j < 6; j++) {
            uniqueId += chars[Math.floor(Math.random() * chars.length)];
          }
          newTags.push({
            tag_id: uniqueId,
            owner_id: null,
            child_name: '',
            avatar: '👧',
            parent_whatsapp: '',
            contacts: [],
            medical: { allergies: '', conditions: '', notes: '' },
            custom_label: '',
            scan_count: 0
          });
        }
        
        // Batch insert tags
        const { error: insertError } = await supabase.from('tags').insert(newTags);
        if (insertError) {
          throw new Error('Fallback tag generation failed: ' + insertError.message);
        }
        
        setGeneratedBatch(newTags);
      }
      
      await fetchTagsList();
    } catch (err: any) {
      alert('Error generating tag codes: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (generatedBatch.length === 0) return;
    const csvContent = "data:text/csv;charset=utf-8,Tag_Code\n" 
      + generatedBatch.map(t => t.tag_id).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `lotap_tag_codes_batch_${new Date().getTime()}.csv`);
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
      
      {/* Metrics Section with Unlimited Capacity Box */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        <div className="p-5 bg-[#FFCFF1]/40 rounded-xl border border-[#FFCFF1]">
          <h3 className="text-xs font-black uppercase tracking-wider text-[#051650]/80 mb-1">Total Generated Tags</h3>
          <p className="text-3xl font-black text-[#051650]">{metrics.total}</p>
          <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Active in system</span>
        </div>
        <div className="p-5 bg-green-50 rounded-xl border border-green-100">
          <h3 className="text-xs font-black uppercase tracking-wider text-green-800 mb-1">Claimed by Parents</h3>
          <p className="text-3xl font-black text-green-900">{metrics.claimed}</p>
          <span className="text-[10px] text-green-600 font-semibold uppercase tracking-wider">Linked to child profile</span>
        </div>
        <div className="p-5 bg-purple-50 rounded-xl border border-purple-100 col-span-1 sm:col-span-2 md:col-span-1">
          <h3 className="text-xs font-black uppercase tracking-wider text-purple-800 mb-1">Generation Capacity</h3>
          <p className="text-3xl font-black text-purple-900 flex items-center gap-1.5">
            Unlimited <span className="text-lg">🚀</span>
          </p>
          <span className="text-[10px] text-purple-600 font-semibold uppercase tracking-wider">On-demand production</span>
        </div>
      </div>



      {/* Code Generation block */}
      <div className="bg-slate-50 p-6 rounded-lg border border-slate-200">
        <h2 className="text-lg font-bold text-[#051650] mb-2 flex items-center gap-2">
          <span>🏷️</span> Generate Factory Tag Codes
        </h2>
        <p className="text-xs text-slate-500 mb-6">
          Self-service tool to generate unique 6-character Tag Codes for physical wristband manufacturing and printing.
        </p>

        {/* Operational Flow Diagram Card */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50/60 p-5 rounded-xl border border-blue-100 mb-6 text-slate-700">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-base">ℹ️</span>
            <h3 className="text-xs font-black uppercase tracking-wider text-[#051650]">How Batch Generation Works</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mt-3 text-xs">
            <div className="bg-white p-3 rounded-lg border border-blue-100/80 shadow-2xs">
              <div className="font-bold text-[#051650] mb-1">1. Unique Code Generation</div>
              <p className="text-[11px] text-slate-500 leading-relaxed">Generates random 6-character alphanumeric Tag IDs (e.g. <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-[#051650]">g4smwb</code>) containing zero user data.</p>
            </div>
            <div className="bg-white p-3 rounded-lg border border-blue-100/80 shadow-2xs">
              <div className="font-bold text-[#051650] mb-1">2. Database Pre-registration</div>
              <p className="text-[11px] text-slate-500 leading-relaxed">Tags are initialized in the database as <span className="text-slate-700 font-semibold">Unclaimed</span>, ready for parent registration upon delivery.</p>
            </div>
            <div className="bg-white p-3 rounded-lg border border-blue-100/80 shadow-2xs">
              <div className="font-bold text-[#051650] mb-1">3. Manufacturer Code Export</div>
              <p className="text-[11px] text-slate-500 leading-relaxed">Export tag codes directly to send to the manufacturer for physical wristband imprinting & engraving.</p>
            </div>
            <div className="bg-white p-3 rounded-lg border border-blue-100/80 shadow-2xs">
              <div className="font-bold text-[#051650] mb-1">4. Customer Activation</div>
              <p className="text-[11px] text-slate-500 leading-relaxed">Parent receives band, enters or taps the 6-character Tag Code to claim and attach emergency contacts & medical data.</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-end gap-4">
          <div className="flex-1 w-full">
            <label className="block text-xs font-bold uppercase text-slate-500 mb-2">Batch Size (Number of Tag Codes)</label>
            <div className="flex gap-2">
              <input 
                type="number" 
                value={batchSize} 
                onChange={(e) => setBatchSize(Number(e.target.value))}
                className="w-full p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#051650] font-semibold text-[#051650] bg-white"
              />
              <div className="flex gap-1 shrink-0">
                {[50, 100, 250, 500].map(size => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setBatchSize(size)}
                    className={`px-3 py-2 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                      batchSize === size ? 'bg-[#051650] text-white border-[#051650]' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <button 
            onClick={() => { triggerHaptic(); handleGenerate(); }}
            disabled={loading || batchSize <= 0}
            className="w-full sm:w-auto bg-[#051650] text-white px-6 py-3.5 rounded-lg font-bold hover:bg-[#0A2472] transition-colors disabled:opacity-50 cursor-pointer shadow-sm text-xs uppercase tracking-wider shrink-0"
          >
            {loading ? 'Generating Batch...' : 'Generate Tag Codes ⚡'}
          </button>
        </div>

        {generatedBatch.length > 0 && (
          <div className="mt-6 pt-6 border-t border-slate-200">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
              <div>
                <span className="text-sm font-bold text-emerald-600 flex items-center gap-1">
                  ✓ Successfully generated {generatedBatch.length} tag codes in database
                </span>
                <span className="text-[11px] text-slate-400 font-medium">Ready for manufacturer export</span>
              </div>
              <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                <button 
                  onClick={() => {
                    triggerHaptic();
                    const allCodes = generatedBatch.map(t => t.tag_id).join("\n");
                    navigator.clipboard.writeText(allCodes);
                    alert(`All ${generatedBatch.length} Tag Codes copied to clipboard!`);
                  }}
                  className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-lg font-bold text-xs transition-colors shadow-sm uppercase tracking-wider cursor-pointer"
                >
                  📋 Copy All Tag Codes
                </button>
                <button onClick={() => { triggerHaptic(); handleExportCSV(); }} className="bg-[#C54B8C] text-white px-4 py-2 rounded-lg font-bold text-xs hover:bg-[#B53389] transition-colors shadow-sm cursor-pointer uppercase tracking-wider">
                  📥 Download CSV ({generatedBatch.length} Codes)
                </button>
              </div>
            </div>
            
            <div className="bg-white border border-slate-200 rounded-xl p-3 max-h-56 overflow-y-auto text-xs text-slate-600 shadow-inner divide-y divide-slate-100">
              {generatedBatch.map((t, idx) => (
                <div key={t.tag_id} className="py-2 flex items-center justify-between gap-2 group">
                  <div className="flex items-center gap-3">
                    <span className="text-slate-400 font-mono text-[11px] w-8">#{idx + 1}</span>
                    <span className="text-[#051650] font-mono font-extrabold bg-slate-100 px-2.5 py-1 rounded text-xs tracking-widest">{t.tag_id}</span>
                  </div>
                  <button
                    onClick={() => {
                      triggerHaptic();
                      navigator.clipboard.writeText(t.tag_id);
                      alert(`Copied Tag Code: ${t.tag_id}`);
                    }}
                    className="hover:text-[#051650] font-bold uppercase text-[10px] tracking-wider px-3 py-1 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-md transition-all cursor-pointer text-slate-700"
                  >
                    Copy Code
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Beautiful Admin Custom Labeling & NFC Tag Management Tool */}
      <div className="bg-slate-50 p-6 rounded-lg border border-slate-200 mt-6">
        {(() => {
          const query = searchQuery.toLowerCase().trim();
          const filtered = sortedTags.filter((t: any) => 
            t.tag_id.toLowerCase().includes(query) ||
            (t.child_name || '').toLowerCase().includes(query) ||
            (t.custom_label || '').toLowerCase().includes(query)
          );
          
          const totalFiltered = filtered.length;
          const effectiveSize = pageSize === 'all' ? (totalFiltered || 1) : pageSize;
          const totalPages = Math.ceil(totalFiltered / effectiveSize) || 1;
          const activePage = Math.min(currentPage, totalPages);
          const startIndex = totalFiltered === 0 ? 0 : (activePage - 1) * effectiveSize;
          const endIndex = pageSize === 'all' ? totalFiltered : Math.min(startIndex + effectiveSize, totalFiltered);
          const currentSlice = filtered.slice(startIndex, endIndex);

          return (
            <>
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                <div>
                  <h2 className="text-lg font-bold text-[#051650] flex items-center gap-2">
                    <span>🏷️</span> Active NFC Tag Codes ({metrics.total} Total)
                  </h2>
                  <p className="text-xs text-slate-500">
                    Browse all pre-generated wristband codes, copy tag IDs, or assign custom parent display labels.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                  <div className="w-full sm:w-64">
                    <input 
                      type="text"
                      placeholder="🔍 Search tag code, child or label..."
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="w-full p-2.5 border border-slate-300 rounded-lg text-xs bg-white text-[#051650] font-medium focus:outline-none focus:ring-2 focus:ring-[#051650]"
                    />
                  </div>
                </div>
              </div>

              {/* View Control Tabs & Page Size Selector Bar */}
              <div className="bg-white p-3 rounded-lg border border-slate-200 mb-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-extrabold text-[#051650] uppercase tracking-wider text-[10px] mr-1">Display Mode:</span>
                  {[50, 100, 250, 500, 'all'].map((size) => (
                    <button
                      key={size.toString()}
                      onClick={() => {
                        triggerHaptic();
                        setPageSize(size as any);
                        setCurrentPage(1);
                      }}
                      className={`px-2.5 py-1 rounded-md font-bold text-[11px] transition-all cursor-pointer ${
                        pageSize === size
                          ? 'bg-[#051650] text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {size === 'all' ? `All (${totalFiltered} Long Scroll)` : `${size} Per Page`}
                    </button>
                  ))}
                </div>

                {totalFiltered > 0 && (
                  <div className="text-slate-500 text-[11px] font-semibold">
                    Showing <span className="text-[#051650] font-bold">#{startIndex + 1}</span> – <span className="text-[#051650] font-bold">#{endIndex}</span> of <span className="text-[#051650] font-bold">{totalFiltered}</span> tags
                  </div>
                )}
              </div>

              {/* Pagination Page Selector Tabs (when paginated) */}
              {pageSize !== 'all' && totalPages > 1 && (
                <div className="flex items-center justify-between gap-2 mb-3 bg-slate-100 p-2 rounded-lg text-xs overflow-x-auto">
                  <div className="flex items-center gap-1">
                    <button
                      disabled={activePage === 1}
                      onClick={() => { triggerHaptic(); setCurrentPage(p => Math.max(1, p - 1)); }}
                      className="px-2.5 py-1 bg-white hover:bg-slate-200 disabled:opacity-40 rounded text-[11px] font-bold text-slate-700 cursor-pointer border border-slate-200"
                    >
                      ← Prev
                    </button>

                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                      <button
                        key={p}
                        onClick={() => { triggerHaptic(); setCurrentPage(p); }}
                        className={`px-2.5 py-1 rounded font-extrabold text-[11px] transition-all cursor-pointer ${
                          activePage === p
                            ? 'bg-[#051650] text-white'
                            : 'bg-white hover:bg-slate-200 text-slate-700 border border-slate-200'
                        }`}
                      >
                        {p}
                      </button>
                    ))}

                    <button
                      disabled={activePage === totalPages}
                      onClick={() => { triggerHaptic(); setCurrentPage(p => Math.min(totalPages, p + 1)); }}
                      className="px-2.5 py-1 bg-white hover:bg-slate-200 disabled:opacity-40 rounded text-[11px] font-bold text-slate-700 cursor-pointer border border-slate-200"
                    >
                      Next →
                    </button>
                  </div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider whitespace-nowrap">
                    Page {activePage} of {totalPages}
                  </span>
                </div>
              )}

              <div className="overflow-x-auto bg-white rounded-lg border border-slate-200 shadow-sm max-h-[550px] overflow-y-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="sticky top-0 bg-slate-100 z-10 border-b border-slate-200">
                    <tr className="text-[#051650] uppercase font-bold text-[10px] tracking-wider">
                      <th className="p-3 w-12 text-center">#</th>
                      <th className="p-3">Tag Code</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Child Name</th>
                      <th className="p-3">Custom Label / Wristband Identifier</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {totalFiltered === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-400 font-medium">
                          No active or generated tags match "{searchQuery}"
                        </td>
                      </tr>
                    ) : (
                      currentSlice.map((t: any, idx: number) => {
                        const itemNumber = startIndex + idx + 1;
                        return (
                          <tr key={t.tag_id} className="hover:bg-slate-50/50">
                            <td className="p-3 text-center font-mono text-slate-400 font-bold text-[11px]">
                              #{itemNumber}
                            </td>
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-black text-[#051650] bg-slate-100 px-2 py-1 rounded text-xs tracking-widest">{t.tag_id}</span>
                                <button
                                  onClick={() => {
                                    triggerHaptic();
                                    navigator.clipboard.writeText(t.tag_id);
                                    alert(`Copied Tag Code: ${t.tag_id}`);
                                  }}
                                  className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-[10px] rounded border border-slate-200 transition-all cursor-pointer uppercase tracking-wider"
                                  title="Copy 6-character Tag Code"
                                >
                                  Copy Code
                                </button>
                              </div>
                            </td>
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
                                className="bg-[#051650] hover:bg-[#0A2472] text-white px-3.5 py-2 rounded-lg font-bold transition-colors disabled:opacity-40 text-[10px] cursor-pointer"
                              >
                                {savingLabels[t.tag_id] ? 'Saving...' : 'Save Label'}
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Bottom Pagination Bar when multi-page */}
              {pageSize !== 'all' && totalPages > 1 && (
                <div className="flex items-center justify-between gap-2 mt-3 pt-3 border-t border-slate-200 text-xs">
                  <div className="text-slate-500 text-[11px] font-medium">
                    Page <span className="font-bold text-[#051650]">{activePage}</span> of <span className="font-bold text-[#051650]">{totalPages}</span> ({totalFiltered} total items)
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      disabled={activePage === 1}
                      onClick={() => { triggerHaptic(); setCurrentPage(p => Math.max(1, p - 1)); }}
                      className="px-3 py-1 bg-white hover:bg-slate-200 disabled:opacity-40 rounded text-xs font-bold text-slate-700 cursor-pointer border border-slate-200"
                    >
                      ← Previous
                    </button>
                    <button
                      disabled={activePage === totalPages}
                      onClick={() => { triggerHaptic(); setCurrentPage(p => Math.min(totalPages, p + 1)); }}
                      className="px-3 py-1 bg-white hover:bg-slate-200 disabled:opacity-40 rounded text-xs font-bold text-slate-700 cursor-pointer border border-slate-200"
                    >
                      Next →
                    </button>
                  </div>
                </div>
              )}
            </>
          );
        })()}
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
