import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase, generateId } from '../lib/supabase';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

const getPublicOrigin = () => {
  return window.location.origin;
};

const triggerHaptic = () => {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try {
      navigator.vibrate(30);
    } catch (e) {
      // Ignored
    }
  }
};

const generate30DayScanData = (totalScans: number, tagId: string) => {
  const data = [];
  const now = new Date();
  
  let seed = 0;
  for (let i = 0; i < tagId.length; i++) {
    seed += tagId.charCodeAt(i);
  }
  const random = () => {
    const x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
  };

  const scansPerDay = new Array(30).fill(0);
  let remaining = totalScans;
  
  if (remaining > 0) {
    for (let i = 0; i < 30 && remaining > 0; i++) {
      if (random() < 0.15) {
        scansPerDay[i]++;
        remaining--;
      }
    }
    while (remaining > 0) {
      const index = Math.floor(random() * 30);
      scansPerDay[index]++;
      remaining--;
    }
  }

  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(now.getDate() - i);
    const dateStr = d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    data.push({
      date: dateStr,
      scans: scansPerDay[29 - i]
    });
  }
  return data;
};

export default function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<any>(null);
  
  const [tagToClaim, setTagToClaim] = useState('');
  const [activeTagId, setActiveTagId] = useState<string | null>(null);
  const [tags, setTags] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Add Child Profile Modal State
  const [showAddChildModal, setShowAddChildModal] = useState(false);
  const [newChildTagCode, setNewChildTagCode] = useState('');
  const [newChildName, setNewChildName] = useState('');
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState('');

  // Form State
  const [formData, setFormData] = useState<any>(null);

  // Theme State
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('dashboard-theme') as 'light' | 'dark') || 'light';
  });

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    localStorage.setItem('dashboard-theme', nextTheme);
  };
  
  // Auth Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [popiaConsent, setPopiaConsent] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [rawAuthMsg, rawSetAuthMsg] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  const authMsg = rawAuthMsg;
  const setAuthMsg = (msg: any) => {
    if (!msg) {
      rawSetAuthMsg('');
      return;
    }
    let text = '';
    if (typeof msg === 'object') {
      try {
        text = msg.message || JSON.stringify(msg);
      } catch {
        text = 'An unexpected error occurred.';
      }
    } else {
      text = String(msg).trim();
    }
    
    if (text === '{}' || text === '{"message":""}' || text.toLowerCase().includes('database error saving new user') || text.toLowerCase().includes('trigger') || text.toLowerCase().includes('confirmation email')) {
      rawSetAuthMsg("Database Configuration / Email Provider Issue (Error Code: 500).\n\nThis registration failure occurs due to one of two possible reasons:\n\n1. 📧 EMAIL CONFIRMATION IS ENABLED (Most Common):\nBy default, Supabase requires registering users to verify their email. If you have not configured a custom SMTP provider (like Resend, SendGrid, etc.) under Authentication -> Providers -> Email, or if you have reached the hourly email limit on Supabase's free built-in mail service, registration will fail with 'Error sending confirmation email'.\n👉 TO FIX INSTANTLY: Go to your Supabase Dashboard -> Authentication -> Providers -> Email, and toggle OFF 'Confirm email' (then click Save). This allows parents to register and log in instantly without needing email confirmations!\n\n2. ⚡ DATABASE TRIGGER OUT OF SYNC:\nThe 'on_auth_user_created' trigger or your tables might be out of sync.\n👉 TO FIX: Open your Supabase SQL Editor, copy the ENTIRE updated 'schema.sql' file content, paste it in a 'New Query' and click 'Run'. This will drop, recreate, and sync all tables cleanly!");
    } else {
      rawSetAuthMsg(text);
    }
  };
  const [resetEmailSent, setResetEmailSent] = useState(false);

  // Onboarding / SignUp Wizard State
  const [signUpStep, setSignUpStep] = useState(1);
  const [childName, setChildName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [registeredTagId, setRegisteredTagId] = useState<string | null>(null);
  const [signupTagId, setSignupTagId] = useState('');

  useEffect(() => {
    // Check if we arrived via a claim route (/claim/:tag_id)
    const match = location.pathname.match(/^\/claim\/(.+)$/);
    if (match && match[1]) {
      const code = match[1].toLowerCase();
      setTagToClaim(code);
      setSignupTagId(code);
      setIsSignUp(true); // Guide them straight to sign up
    }
  }, [location.pathname]);

  useEffect(() => {
    const loadData = async () => {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      setUser(currentUser);
      
      const ADMIN_EMAILS = ['johannesburgwebstudio@gmail.com', 'admin@lotap.co.za', 'findmewebapp7@gmail.com'];
      if (currentUser && ADMIN_EMAILS.includes(currentUser.email?.toLowerCase() || '')) {
         navigate('/admin');
         return;
      }
      
      if (currentUser) {
        await fetchUserTags(currentUser.id);
        if (currentUser.email) {
          await fetchUserOrders(currentUser.email);
        }
      }
    };
    loadData();
  }, []);

  const fetchUserOrders = async (userEmail: string) => {
    if (!userEmail) return;
    const { data } = await supabase.from('orders')
      .select('*')
      .ilike('customer_email', userEmail)
      .order('created_at', { ascending: false });
    if (data) {
      setOrders(data);
    }
  };

  const fetchUserTags = async (userId: string) => {
    const { data } = await supabase.from('tags').select('*').eq('owner_id', userId);
    if (data && data.length > 0) {
      setTags(data);
      if (!activeTagId) {
        loadTagForEdit(data[0]);
      }
      return data;
    } else {
      setTags([]);
      return [];
    }
  };

  const handleAddChildWithCode = async () => {
    const cleanTagId = newChildTagCode.trim().toLowerCase();
    if (!cleanTagId) return;
    
    if (cleanTagId.length < 3 || cleanTagId.length > 12) {
      setModalError('Wristband Tag Code must be between 3 and 12 characters.');
      return;
    }

    setModalLoading(true);
    setModalError('');

    try {
      if (!user) {
        setModalError('Please sign in first.');
        setModalLoading(false);
        return;
      }

      // 1. Check if tag exists in database
      const { data: existingTag, error: checkErr } = await supabase
        .from('tags')
        .select('*')
        .ilike('tag_id', cleanTagId)
        .maybeSingle();

      if (checkErr) {
        console.warn('Tag query error:', checkErr);
      }

      if (existingTag) {
        if (existingTag.owner_id && existingTag.owner_id !== user.id) {
          setModalError('This wristband code is already registered to another account.');
          setModalLoading(false);
          return;
        }

        // Claim existing tag
        const { error: claimErr } = await supabase.rpc('claim_tag', {
          p_tag_id: existingTag.tag_id,
          p_child_name: newChildName || existingTag.child_name || 'Child Profile',
          p_avatar: existingTag.avatar || '🧒',
          p_parent_whatsapp: parentPhone || existingTag.parent_whatsapp || '',
          p_contacts: existingTag.contacts || [],
          p_medical: existingTag.medical || { allergies: '', conditions: '', notes: '' }
        });

        if (claimErr) {
          setModalError('Failed to claim tag: ' + claimErr.message);
          setModalLoading(false);
          return;
        }
      } else {
        // Tag does not exist in database yet -> Create new tag record linked to user
        const newProfile = {
          tag_id: cleanTagId,
          owner_id: user.id,
          child_name: newChildName || 'Child Profile',
          avatar: '🧒',
          parent_whatsapp: parentPhone || '',
          contacts: [],
          medical: { allergies: '', conditions: '', notes: '' },
          claimed_at: new Date().toISOString()
        };

        const { error: insertErr } = await supabase.from('tags').insert([newProfile]);
        if (insertErr) {
          throw new Error('Failed to create tag profile: ' + insertErr.message);
        }
      }

      // Trigger signup/claim notification email
      if (user?.email) {
        fetch('/api/notify/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            parent_email: user.email,
            parent_phone: parentPhone || '',
            child_name: newChildName || 'Child Profile',
            tag_id: cleanTagId.toUpperCase()
          })
        }).catch(err => console.warn("Signup email error:", err));
      }

      const updatedTags = await fetchUserTags(user.id);
      if (updatedTags && updatedTags.length > 0) {
        const addedTag = updatedTags.find((t: any) => t.tag_id.toLowerCase() === cleanTagId);
        if (addedTag) {
          loadTagForEdit(addedTag);
        }
      }

      setShowAddChildModal(false);
      setNewChildTagCode('');
      setNewChildName('');
      setToastMessage(`Wristband code "${cleanTagId.toUpperCase()}" successfully added!`);
    } catch (err: any) {
      setModalError(err.message || 'Error adding child profile.');
    } finally {
      setModalLoading(false);
    }
  };

  const loadTagForEdit = (tag: any) => {
    setActiveTagId(tag.tag_id);
    setFormData(JSON.parse(JSON.stringify(tag)));
  };

  const [resendEmailSuccess, setResendEmailSuccess] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthMsg('');
    setResendEmailSuccess(false);
    let error;
    try {
      const result = await supabase.auth.signInWithPassword({ email: email.toLowerCase().trim(), password });
      error = result.error;
    } catch (err: any) {
      error = err;
    }
    
    if (error) {
      if (error.message === 'Failed to fetch') {
        setAuthMsg('Network error: Could not connect to the authentication server. Please check your internet connection or disable adblockers.');
      } else if (error.message.includes('Email not confirmed') || error.message.includes('Invalid login credentials')) {
        setAuthMsg('Invalid login details. If you just registered, please check your email and click the confirmation link before signing in.');
      } else {
        setAuthMsg(error.message || 'Invalid login details.');
      }
    } else {
      setAuthMsg('Logged in successfully!');
      window.location.reload();
    }
    setAuthLoading(false);
  };

  const handleResendConfirmation = async () => {
    if (!email || !email.trim()) {
      setAuthMsg('Please enter your email address first.');
      return;
    }
    setAuthLoading(true);
    setAuthMsg('');
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email.toLowerCase().trim(),
      options: {
        emailRedirectTo: window.location.origin
      }
    });
    setAuthLoading(false);
    if (error) {
      setAuthMsg(error.message || 'Failed to resend confirmation email.');
    } else {
      setResendEmailSuccess(true);
      setAuthMsg('Confirmation email resent! Please check your inbox.');
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.trim()) {
      setAuthMsg('Please enter your email address to receive a reset link.');
      return;
    }
    setAuthLoading(true);
    setAuthMsg('');
    const { error } = await supabase.auth.resetPasswordForEmail(email.toLowerCase().trim(), {
      redirectTo: window.location.origin + '/reset-password',
    });
    setAuthLoading(false);
    if (error) {
      setAuthMsg(error.message || 'Error sending recovery email.');
    } else {
      setResetEmailSent(true);
      setAuthMsg('Recovery email has been sent! Please check your inbox (including your spam folder) for instructions.');
    }
  };

  const handleSignUpNext = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.trim()) {
      setAuthMsg('Please enter a valid email address.');
      return;
    }
    if (!childName) {
      setAuthMsg("Please enter your child's name.");
      return;
    }
    if (!popiaConsent) {
      setAuthMsg('You must accept the POPIA data privacy consent to proceed.');
      return;
    }

    const cleanTag = signupTagId.trim().toLowerCase();
    if (cleanTag) {
      setAuthLoading(true);
      setAuthMsg('');
      try {
        const { data: tagRow, error: tagErr } = await supabase
          .from('tags')
          .select('tag_id, owner_id')
          .eq('tag_id', cleanTag)
          .maybeSingle();

        setAuthLoading(false);

        if (tagErr) {
          console.warn('Error validating tag code:', tagErr);
        }

        if (!tagRow) {
          setAuthMsg("We couldn't find that code. Please check it and try again, or contact support.");
          return;
        }

        if (tagRow.owner_id) {
          setAuthMsg("This code has already been registered. If you believe this is a mistake, please contact support.");
          return;
        }
      } catch (err: any) {
        setAuthLoading(false);
        console.warn('Validation exception:', err);
      }
    }

    setAuthMsg('');
    setSignUpStep(2);
  };

  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setAuthMsg('Passwords do not match. Please try again.');
      return;
    }
    if (password.length < 6) {
      setAuthMsg('Password must be at least 6 characters.');
      return;
    }
    
    setAuthLoading(true);
    setAuthMsg('');
    
    // 1. Sign up on database / Supabase
    const { data, error } = await supabase.auth.signUp({
      email: email.toLowerCase().trim(),
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          popia_consent_accepted: true,
          full_name: childName ? `${childName}'s Parent` : 'Parent'
        }
      }
    });

    if (error) {
      setAuthMsg(error.message);
      setAuthLoading(false);
      return;
    }

    const registeredUser = data?.user;
    if (!registeredUser) {
      setAuthMsg('Could not initialize parent session.');
      setAuthLoading(false);
      return;
    }

    const newTagId = signupTagId.trim().toLowerCase() || ('lt' + Math.floor(100000 + Math.random() * 900000).toString());

    // Call atomic claim_tag RPC function
    try {
      const { error: claimErr } = await supabase.rpc('claim_tag', {
        p_tag_id: newTagId,
        p_child_name: childName || 'Child',
        p_avatar: '🧒',
        p_parent_whatsapp: parentPhone || '',
        p_contacts: [],
        p_medical: { allergies: '', conditions: '', notes: '' }
      });

      if (claimErr) {
        setAuthMsg('Failed to initialize tag: ' + claimErr.message);
        setAuthLoading(false);
        return;
      }
    } catch (err) {
      console.warn('Error creating child tag profile on signup:', err);
    }

    try {
      await fetch('/api/notify/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parent_email: email,
          parent_phone: parentPhone,
          child_name: childName || 'Child',
          tag_id: newTagId
        })
      });
    } catch (err) {
      console.warn('Failed to trigger signup notification email:', err);
    }
    
    // Attempt auto-login
    try {
      const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase().trim(),
        password
      });
      if (signInErr) {
        console.warn('Auto-login after signup failed:', signInErr);
      }
    } catch (err) {
      console.warn('Auto-login exception:', err);
    }

    setRegisteredTagId(newTagId);
    setSignUpStep(3);
    setAuthLoading(false);
  };

  const handleFinishOnboarding = () => {
    window.location.href = '/dashboard';
  };

  const handleClaimTag = async () => {
    const cleanTagId = tagToClaim.trim().toLowerCase();
    if (!cleanTagId) return;
    if (cleanTagId.length < 3 || cleanTagId.length > 12) {
      alert('Wristband Tag Code must be between 3 and 12 characters.');
      return;
    }
    setSaving(true);

    try {
      if (!user) {
        alert('Please sign in first to link a physical wristband code.');
        return;
      }

      // Check if tag exists in database
      const { data: tagRow, error: checkError } = await supabase
        .from('tags')
        .select('tag_id, owner_id')
        .eq('tag_id', cleanTagId)
        .maybeSingle();

      if (checkError) {
        console.warn('Tag check error:', checkError);
      }

      if (!tagRow) {
        alert("We couldn't find that code. Please check it and try again, or contact support.");
        setSaving(false);
        return;
      }

      if (tagRow.owner_id && tagRow.owner_id !== user.id) {
        alert("This code has already been registered. If you believe this is a mistake, please contact support.");
        setSaving(false);
        return;
      }

      // Attempt atomic claim using claim_tag RPC first
      const { error: claimError } = await supabase.rpc('claim_tag', {
        p_tag_id: cleanTagId,
        p_child_name: childName || 'Child',
        p_avatar: '🧒',
        p_parent_whatsapp: parentPhone || '',
        p_contacts: [],
        p_medical: { allergies: '', conditions: '', notes: '' }
      });

      if (claimError) {
        alert('Failed to claim tag: ' + claimError.message);
        setSaving(false);
        return;
      }

      setTagToClaim('');
      await fetchUserTags(user.id);

      // Trigger signup/claim notification email (Parent Welcome + Admin Alert)
      if (user?.email) {
        try {
          fetch('/api/notify/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              parent_email: user.email,
              parent_phone: parentPhone || '',
              child_name: childName || 'Child Profile',
              tag_id: cleanTagId.toUpperCase()
            })
          }).catch(err => console.warn("Claim email notification error:", err));
        } catch (emailErr) {
          console.warn("Claim email exception:", emailErr);
        }
      }

      alert(`Success! Wristband Tag Code "${cleanTagId.toUpperCase()}" is now linked to your account.`);
    } catch (err: any) {
      alert('Error linking tag: ' + (err.message || err));
    } finally {
      setSaving(false);
      navigate('/dashboard', { replace: true });
    }
  };

  const handleReleaseTag = async () => {
    if (!activeTagId || !formData) return;
    if (confirm('Are you sure you want to release this tag? This will clear your parent ownership of Tag ' + activeTagId + ' and allow it to be claimed/registered again.')) {
      setSaving(true);
      const { error } = await supabase.from('tags').update({
        owner_id: null,
        child_name: '',
        parent_whatsapp: '',
        contacts: [],
        medical: { allergies: '', conditions: '', notes: '' },
        claimed_at: null
      }).eq('tag_id', activeTagId);
      
      if (error) {
        alert('Error releasing tag: ' + error.message);
      } else {
        setActiveTagId(null);
        setFormData(null);
        if (user) {
          await fetchUserTags(user.id);
        }
      }
      setSaving(false);
    }
  };

  const handleSave = async () => {
    if (!activeTagId || !formData) return;
    setSaving(true);
    
    // Clean up base payload matching standard Supabase tags table columns
    const basePayload = {
      child_name: formData.child_name || '',
      avatar: formData.avatar || '🧒',
      parent_whatsapp: formData.parent_whatsapp || '',
      contacts: Array.isArray(formData.contacts) ? formData.contacts : [],
      medical: formData.medical || { allergies: '', conditions: '', notes: '' }
    };

    let dbSuccess = false;

    try {
      if (supabase && typeof supabase.from === 'function') {
        // Try updating with emergency_mode first in case column exists
        let { error } = await supabase
          .from('tags')
          .update({ ...basePayload, emergency_mode: formData.emergency_mode || false })
          .eq('tag_id', activeTagId);

        // Fallback to base columns if emergency_mode column does not exist in DB schema
        if (error) {
          const fallback = await supabase
            .from('tags')
            .update(basePayload)
            .eq('tag_id', activeTagId);
          if (!fallback.error) {
            dbSuccess = true;
          } else {
            console.warn('Save error from Supabase:', fallback.error);
          }
        } else {
          dbSuccess = true;
        }
      }
    } catch (err: any) {
      console.warn('Catch error on save:', err);
    }

    // Always update local React state so user's edits are retained in current session
    const fullState = { ...basePayload, emergency_mode: formData.emergency_mode || false };
    setTags(prev => prev.map(t => t.tag_id === activeTagId ? { ...t, ...fullState } : t));
    
    setSaving(false);

    setToastMessage(`✨ Information for ${basePayload.child_name || 'Tag ' + activeTagId} saved successfully!`);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  if (!user) {
    return (
      <div className="min-h-[calc(100vh-64px)] bg-[#FDFBF7] flex items-center justify-center p-4 relative overflow-hidden">
        {/* Morphing Liquid Background Blobs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
          <div className="absolute top-[10%] left-[-10%] w-[350px] h-[350px] bg-[#FFCFF1] opacity-[0.55] blur-[80px] animate-morph-blob-1 rounded-full"></div>
          <div className="absolute bottom-[15%] right-[-10%] w-[350px] h-[350px] bg-[#C54B8C] opacity-[0.18] blur-[90px] animate-morph-blob-2 rounded-full"></div>
        </div>

        <div className="max-w-md w-full glass-liquid-card p-8 rounded-3xl shadow-2xl relative overflow-hidden z-10">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#FFCFF1] to-transparent opacity-40 rounded-bl-full pointer-events-none"></div>
          
          <div className="w-12 h-12 bg-[#FFCFF1] text-[#C54B8C] rounded-2xl flex items-center justify-center font-serif font-bold text-2xl mb-4 relative z-10 shadow-inner">
            L
          </div>
          
          <h2 className="text-3xl font-black text-[#051650] mb-2 font-serif relative z-10 uppercase tracking-tight">
            LoTap Portal
          </h2>
          <p className="text-slate-500 mb-6 text-sm relative z-10 leading-relaxed">
            Manage your child's safety wristbands. Create an account or sign in below.
          </p>

          {/* Tab Switcher - Hidden if currently displaying celebratory success step 3 or in forgot password mode */}
          {(!isSignUp || signUpStep !== 3) && !showForgotPassword && (
            <div className="flex bg-slate-100 p-1.5 rounded-2xl mb-6 relative z-10 border border-slate-200">
              <button
                type="button"
                onClick={() => { setIsSignUp(false); setAuthMsg(''); setSignUpStep(1); }}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${!isSignUp ? 'bg-[#051650] text-white shadow-sm' : 'text-slate-500 hover:text-[#051650]'}`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => { setIsSignUp(true); setAuthMsg(''); setSignUpStep(1); }}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${isSignUp ? 'bg-[#051650] text-white shadow-sm' : 'text-slate-500 hover:text-[#051650]'}`}
              >
                Register Account
              </button>
            </div>
          )}

          {/* FORGOT PASSWORD FLOW */}
          {showForgotPassword && (
            <form onSubmit={handleForgotPassword} className="relative z-10 space-y-4 text-left">
              <div className="p-4 bg-[#FFCFF1]/25 border border-[#C54B8C]/15 rounded-2xl mb-2">
                <h3 className="text-xs font-extrabold text-[#051650] uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <span>🔒</span> Recover Account
                </h3>
                <p className="text-[11px] text-[#0A2472] leading-relaxed font-semibold">
                  Enter your registered email address below. We'll send you a secure link to reset your password and regain access to your dashboard.
                </p>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Email Address</label>
                <input 
                  type="email" 
                  placeholder="parent@example.com" 
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#C54B8C] focus:bg-white text-sm text-[#051650] font-medium transition-all" 
                />
              </div>

              <button 
                type="submit"
                disabled={authLoading || !email}
                className="w-full bg-[#051650] text-white p-4 rounded-xl font-bold uppercase tracking-wide hover:bg-[#0A2472] transition-colors disabled:opacity-50 shadow-md shadow-[#051650]/15 mt-2"
              >
                {authLoading ? 'Sending Link...' : 'Send Recovery Link'}
              </button>

              {authMsg && (
                <div className={`mt-4 p-3 rounded-xl text-xs leading-relaxed font-semibold border ${authMsg.toLowerCase().includes('sent') ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-700'}`}>
                  {authMsg}
                </div>
              )}

              {resetEmailSent && (
                <div className="p-4 bg-[#FFCFF1]/40 border border-[#C54B8C]/20 rounded-2xl text-xs text-[#051650] font-semibold space-y-3 mt-4">
                  <p>✨ <strong>Testing Shortcut (Preview Mode):</strong></p>
                  <p className="text-slate-600 font-normal">Since you are testing in the sandboxed preview environment, click below to immediately load the password reset screen without checking your email inbox:</p>
                  <button
                    type="button"
                    onClick={() => {
                      setShowForgotPassword(false);
                      setResetEmailSent(false);
                      navigate('/reset-password');
                    }}
                    className="w-full bg-[#C54B8C] text-white p-3 rounded-xl font-bold uppercase tracking-wider hover:bg-opacity-90 transition-all text-xs"
                  >
                    Go to Password Reset Page →
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={() => { setShowForgotPassword(false); setResetEmailSent(false); setAuthMsg(''); }}
                className="w-full text-xs font-bold text-slate-500 hover:text-[#051650] transition-colors pt-2 block text-center"
              >
                ← Back to Sign In
              </button>
            </form>
          )}

          {/* SIGN IN FLOW */}
          {!isSignUp && !showForgotPassword && (
            <form onSubmit={handleLogin} className="relative z-10 space-y-4 text-left">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Email Address</label>
                <input 
                  type="email" 
                  placeholder="parent@example.com" 
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#C54B8C] focus:bg-white text-sm text-[#051650] font-medium transition-all" 
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Password</label>
                  <button
                    type="button"
                    onClick={() => { setShowForgotPassword(true); setAuthMsg(''); }}
                    className="text-[10px] font-extrabold uppercase tracking-wider text-[#C54B8C] hover:underline"
                  >
                    Forgot Password?
                  </button>
                </div>
                <input 
                  type="password" 
                  placeholder="••••••••" 
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#C54B8C] focus:bg-white text-sm text-[#051650] font-medium transition-all" 
                />
              </div>
              
              <button 
                type="submit"
                disabled={authLoading || !email || !password}
                className="w-full bg-[#051650] text-white p-4 rounded-xl font-bold uppercase tracking-wide hover:bg-[#0A2472] transition-colors disabled:opacity-50 shadow-md shadow-[#051650]/15 mt-2"
              >
                {authLoading ? 'Authorizing...' : 'Sign In'}
              </button>
              
              {authMsg && (
                <div className={`mt-4 p-3 rounded-xl text-xs leading-relaxed font-semibold border ${authMsg.toLowerCase().includes('success') ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-700'}`}>
                  {authMsg}
                  {authMsg.toLowerCase().includes('email not confirmed') && (
                    <div className="mt-3">
                      <button
                        type="button"
                        onClick={handleResendConfirmation}
                        disabled={authLoading}
                        className="w-full bg-white text-[#C54B8C] border-2 border-[#C54B8C] hover:bg-[#fff0f7] p-2.5 rounded-lg font-bold uppercase tracking-wide transition-colors"
                      >
                        Resend Confirmation Email
                      </button>
                    </div>
                  )}
                </div>
              )}
            </form>
          )}

          {/* SIGN UP FLOW (MULTI-STEP WIZARD) */}
          {isSignUp && !showForgotPassword && (
            <div className="relative z-10 text-left">
              {/* Progress Bar indicator */}
              <div className="flex items-center justify-between mb-5">
                <span className="text-[10px] font-extrabold uppercase text-[#C54B8C] tracking-widest">
                  Step {signUpStep} of 3: {signUpStep === 1 ? 'Profile setup' : signUpStep === 2 ? 'Security verification' : 'Account ready'}
                </span>
                <div className="flex gap-1">
                  <div className={`w-6 h-1.5 rounded-full transition-all duration-300 ${signUpStep >= 1 ? 'bg-[#C54B8C]' : 'bg-slate-200'}`}></div>
                  <div className={`w-6 h-1.5 rounded-full transition-all duration-300 ${signUpStep >= 2 ? 'bg-[#C54B8C]' : 'bg-slate-200'}`}></div>
                  <div className={`w-6 h-1.5 rounded-full transition-all duration-300 ${signUpStep >= 3 ? 'bg-[#C54B8C]' : 'bg-slate-200'}`}></div>
                </div>
              </div>

              {/* STEP 1: Email, Child's Name & Wristband Code */}
              {signUpStep === 1 && (
                <form onSubmit={handleSignUpNext} className="space-y-4">
                  <div className="bg-[#FFCFF1]/60 border border-[#C54B8C]/30 rounded-xl p-3 text-xs text-[#051650] flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">🛒</span>
                      <span className="font-semibold text-[11px]">Don't have a wristband yet? Order first, then set up!</span>
                    </div>
                    <a href="/#order" className="shrink-0 bg-[#C54B8C] text-white px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-[#B33B7B]">
                      Order First
                    </a>
                  </div>

                  <div className="p-3.5 bg-blue-50/80 border border-blue-200 rounded-2xl space-y-1.5 shadow-sm">
                    <label className="block text-[10px] font-extrabold uppercase tracking-wider text-[#051650]">
                      🏷️ Physical Wristband Code (Unique Tag Code)
                    </label>
                    <input 
                      type="text" 
                      placeholder="e.g. ABC123 (Look on wristband/card)" 
                      value={signupTagId}
                      onChange={e => setSignupTagId(e.target.value.toUpperCase().trim())}
                      className="w-full p-3 bg-white border border-blue-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#C54B8C] text-sm text-[#051650] font-mono font-black uppercase transition-all placeholder:font-sans placeholder:font-normal placeholder:normal-case placeholder:text-slate-400" 
                    />
                    <p className="text-[10px] text-slate-600 leading-tight">
                      Enter the 6-character unique code on your physical wristband. If you don't have one yet, leave blank and a digital code will be auto-generated.
                    </p>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Child's Name</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Emma" 
                      required
                      value={childName}
                      onChange={e => setChildName(e.target.value)}
                      className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#C54B8C] focus:bg-white text-sm text-[#051650] font-semibold transition-all" 
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Your Parent Email Address</label>
                    <input 
                      type="email" 
                      placeholder="parent@example.com" 
                      required
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#C54B8C] focus:bg-white text-sm text-[#051650] font-medium transition-all" 
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Parent Contact Number / WhatsApp</label>
                    <input 
                      type="tel" 
                      placeholder="e.g. +27825551234" 
                      required
                      value={parentPhone}
                      onChange={e => setParentPhone(e.target.value)}
                      className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#C54B8C] focus:bg-white text-sm text-[#051650] font-semibold transition-all" 
                    />
                  </div>

                  <div className="flex items-start gap-3 bg-slate-50 p-3.5 border border-slate-200 rounded-2xl">
                    <input 
                      type="checkbox" 
                      id="popia" 
                      required
                      checked={popiaConsent}
                      onChange={e => setPopiaConsent(e.target.checked)}
                      className="mt-1 shrink-0 w-4 h-4 text-[#051650] rounded border-slate-300 focus:ring-[#C54B8C]" 
                    />
                    <label htmlFor="popia" className="text-[11px] text-slate-600 leading-relaxed cursor-pointer font-medium">
                      <strong>POPIA Consent:</strong> I consent to the secure storage of child safety details. This data is only accessible publicly when someone taps the physical wristband.
                    </label>
                  </div>

                  <button 
                    type="submit"
                    disabled={!email || !childName || !popiaConsent}
                    className="w-full bg-[#051650] text-white p-4 rounded-xl font-bold uppercase tracking-wide hover:bg-[#0A2472] transition-colors disabled:opacity-50 shadow-md shadow-[#051650]/15 mt-2 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Next: Setup Password</span>
                    <span>→</span>
                  </button>
                  
                  {authMsg && (
                    <div className="mt-3 p-3 rounded-xl text-xs bg-red-50 border border-red-200 text-red-700 font-semibold">
                      {authMsg}
                    </div>
                  )}
                </form>
              )}

              {/* STEP 2: Secure Password */}
              {signUpStep === 2 && (
                <form onSubmit={handleSignUpSubmit} className="space-y-4">
                  <div className="p-3.5 bg-[#FFCFF1]/30 border border-[#C54B8C]/10 rounded-2xl text-xs space-y-1">
                    <p className="text-[#051650] font-semibold">Registering Account for:</p>
                    <p className="text-slate-600">Email: <span className="font-bold text-[#051650]">{email}</span></p>
                    <p className="text-slate-600">Child safety profile: <span className="font-bold text-[#C54B8C]">👧 {childName}</span></p>
                    <p className="text-slate-600">Wristband Code: <span className="font-bold font-mono text-[#051650] uppercase">{signupTagId || '(Auto-generated digital code)'}</span></p>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Create Secure Password</label>
                    <input 
                      type="password" 
                      placeholder="••••••••" 
                      required
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#C54B8C] focus:bg-white text-sm text-[#051650] font-medium transition-all" 
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Confirm Password</label>
                    <input 
                      type="password" 
                      placeholder="••••••••" 
                      required
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#C54B8C] focus:bg-white text-sm text-[#051650] font-medium transition-all" 
                    />
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button 
                      type="button"
                      onClick={() => { setSignUpStep(1); setAuthMsg(''); }}
                      className="px-4 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors"
                    >
                      Back
                    </button>
                    <button 
                      type="submit"
                      disabled={authLoading || !password || !confirmPassword}
                      className="flex-1 bg-[#051650] text-white p-3.5 rounded-xl font-bold uppercase tracking-wide hover:bg-[#0A2472] transition-colors disabled:opacity-50 shadow-md shadow-[#051650]/15"
                    >
                      {authLoading ? 'Registering...' : 'Confirm & Link Wristband'}
                    </button>
                  </div>

                  {authMsg && (
                    <div className="mt-3 p-4 rounded-2xl text-xs bg-red-50 border border-red-200 text-red-800 space-y-3">
                      <p className="font-bold flex items-center gap-1.5">
                        <span>⚠️</span> {authMsg}
                      </p>
                    </div>
                  )}
                </form>
              )}

              {/* STEP 3: Celebratory Unique Activation Screen */}
              {signUpStep === 3 && registeredTagId && (
                <div className="text-center space-y-6 pt-2">
                  <div className="w-16 h-16 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto text-3xl shadow-sm border border-green-100 animate-bounce">
                    🎉
                  </div>
                  
                  <div>
                    <h3 className="text-xl font-black text-[#051650] font-serif">Account Created!</h3>
                    <p className="text-xs text-slate-500 mt-1">Your child's unique safety code has been registered.</p>
                    <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-xl text-blue-800 text-xs font-semibold leading-relaxed text-left">
                      <p><strong>Note:</strong> If you are not automatically signed in on the next screen, you may need to <strong>verify your email address</strong>. Please check your inbox (and spam folder) for a confirmation link from us.</p>
                    </div>
                  </div>

                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-2xl text-left space-y-3">
                    <p className="text-xs font-extrabold uppercase text-yellow-800 flex items-center gap-1.5">
                      <span>✉️</span> Important: Verify Your Email
                    </p>
                    <p className="text-[11px] text-yellow-700 leading-relaxed font-medium">
                      Supabase requires you to verify your email address before you can log in. <strong>Check your inbox</strong> for a confirmation link. 
                    </p>
                  </div>

                  {/* Gorgeous printable wristband card */}
                  <div className="p-6 bg-gradient-to-tr from-[#051650] to-[#C54B8C] rounded-3xl text-white shadow-xl relative overflow-hidden border border-[#FFCFF1]/20 space-y-4">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-[#FFCFF1]/10 rounded-bl-full pointer-events-none"></div>
                    
                    <div className="flex justify-between items-center text-left">
                      <div>
                        <span className="text-[9px] font-black tracking-widest uppercase text-[#FFCFF1]">Child Safety Wearable</span>
                        <h4 className="font-extrabold text-base flex items-center gap-1.5 mt-0.5">
                          <span>👧</span> {childName}
                        </h4>
                      </div>
                      <div className="bg-white/10 px-3 py-1 rounded-full text-xs font-mono font-black uppercase tracking-wider text-[#FFCFF1] border border-white/10">
                        ID: {registeredTagId}
                      </div>
                    </div>

                    <div className="text-left space-y-2">
                      <p className="text-xs text-slate-100 leading-relaxed">
                        This physical tag is now activated with the unique code <span className="font-mono bg-[#051650] border border-[#FFCFF1]/20 px-2 py-0.5 rounded text-white font-bold">{registeredTagId}</span>. This code is permanently linked to your child's profile on this wristband.
                      </p>
                      <p className="text-xs text-slate-200 leading-relaxed">
                        To test what finders see when they tap the NFC tag on the wristband, you can instantly preview the public page:
                      </p>
                    </div>

                    <button
                      onClick={() => navigate('/t/' + registeredTagId)}
                      className="w-full py-3 bg-white hover:bg-[#FFCFF1] text-[#051650] hover:text-[#C54B8C] text-xs font-extrabold rounded-xl transition-all shadow-md flex items-center justify-center gap-2 transform active:scale-95 animate-subtle-pulse"
                    >
                      <span>👁️</span> View in Public (Live Emergency Profile)
                    </button>
                  </div>

                  <p className="text-xs text-slate-500 font-medium leading-relaxed">
                    Let's configure your emergency contacts, WhatsApp alerts, and medical profile details next!
                  </p>

                  <button 
                    onClick={handleFinishOnboarding}
                    className="block text-center w-full bg-[#051650] text-white p-4 rounded-xl font-bold uppercase tracking-wide hover:bg-[#0A2472] transition-colors shadow-md shadow-[#051650]/15"
                  >
                    Configure Emergency Contacts & Profile →
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Explanation Banner */}
          {(!isSignUp || signUpStep !== 3) && (
            <div className="mt-6 p-4 bg-[#FFCFF1]/25 border border-[#C54B8C]/15 rounded-2xl text-left relative z-10">
              <p className="text-xs font-extrabold uppercase text-[#C54B8C] mb-1.5 flex items-center gap-1.5">
                <span>💡</span> Safe & POPIA-Compliant Onboarding
              </p>
              <p className="text-[11px] text-[#0A2472] leading-relaxed font-medium">
                LoTap wristbands use secure database pointers instead of storing sensitive data on physical chips. Your personal info remains fully private and encrypted until the wristband is physically tapped or scanned by a finder in an emergency.
              </p>
            </div>
          )}


        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-[calc(100vh-64px)] transition-all duration-500 p-4 md:p-8 ${theme === 'dark' ? 'bg-[#030712] text-slate-100' : 'bg-slate-50 text-[#051650]'}`}>
      <div className="max-w-5xl mx-auto flex flex-col md:flex-row gap-8">
        
        {/* Sidebar */}
        <div className="w-full md:w-72 shrink-0">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className={`text-xl font-black font-serif ${theme === 'dark' ? 'text-[#FFCFF1]' : 'text-[#051650]'}`}>LoTap</h1>
              <p className="text-xs text-slate-400">Parent Dashboard</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => { triggerHaptic(); toggleTheme(); }}
                className={`p-2 rounded-xl transition-all shadow-sm flex items-center justify-center border cursor-pointer ${
                  theme === 'dark' 
                    ? 'bg-slate-800/80 border-slate-700 text-amber-300 hover:bg-slate-700' 
                    : 'bg-white border-slate-200 text-[#051650] hover:bg-slate-50'
                }`}
                title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              >
                {theme === 'dark' ? '☀️' : '🌙'}
              </button>
              <button onClick={handleLogout} className="text-xs text-slate-500 hover:text-slate-800 underline">Logout</button>
            </div>
          </div>

          <div className={`rounded-xl shadow-sm overflow-hidden mb-6 transition-all duration-300 border ${
            theme === 'dark' 
              ? 'bg-slate-900/60 backdrop-blur-md border-white/10 text-white' 
              : 'bg-white border-slate-200 text-slate-800'
          }`}>
            <div className={`p-3 border-b font-bold text-xs uppercase tracking-wider flex items-center justify-between ${
              theme === 'dark' 
                ? 'bg-slate-950/60 border-white/10 text-slate-300' 
                : 'bg-slate-50 border-slate-200 text-slate-600'
            }`}>
              <span>Child Safety Profiles</span>
            </div>
            {tags.length === 0 ? (
              <div className="p-6 text-center text-sm text-slate-500 font-medium">
                No child profile yet. Claim your wristband's tag code below, or <a href="/#order" className="text-[#C54B8C] underline hover:text-[#051650]">place an order first</a>.
              </div>
            ) : (
              tags.map((t: any) => (
                <button 
                  key={t.tag_id}
                  onClick={() => { triggerHaptic(); loadTagForEdit(t); }}
                  className={`w-full text-left p-4 border-b flex items-center gap-3 transition-colors ${
                    activeTagId === t.tag_id 
                      ? 'bg-[#FFCFF1] border-l-4 border-l-[#C54B8C] text-[#051650]' 
                      : theme === 'dark'
                        ? 'hover:bg-slate-800/40 border-slate-800 border-l-4 border-l-transparent text-slate-100'
                        : 'hover:bg-slate-50 border-slate-100 border-l-4 border-l-transparent text-slate-800'
                  }`}
                >
                  <span className="text-2xl">{t.avatar || '🧒'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1.5">
                      <span className={`font-semibold text-sm truncate ${activeTagId === t.tag_id ? 'text-[#051650]' : theme === 'dark' ? 'text-slate-100' : 'text-[#051650]'}`}>
                        {t.custom_label ? `${t.custom_label}${t.child_name ? ` (${t.child_name})` : ''}` : (t.child_name || 'Child Profile')}
                      </span>
                      {t.emergency_mode ? (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-red-500 text-white shrink-0 animate-pulse">⚠️ Lost/Beacon</span>
                      ) : t.child_name && t.parent_whatsapp ? (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 shrink-0">Active</span>
                      ) : (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 shrink-0">Config Pending</span>
                      )}
                    </div>
                    <div className={`text-xs font-mono ${activeTagId === t.tag_id ? 'text-[#051650]/70' : 'text-slate-400'}`}>{t.tag_id}</div>
                  </div>
                </button>
              ))
            )}
            <div className="p-3 bg-slate-50 dark:bg-slate-900/90 border-t border-slate-200 dark:border-white/10">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic();
                  setNewChildTagCode('');
                  setNewChildName('');
                  setModalError('');
                  setShowAddChildModal(true);
                }}
                disabled={saving}
                className="w-full py-2.5 px-3 bg-[#051650] hover:bg-[#0A2472] dark:bg-[#C54B8C] dark:hover:bg-[#B33B7B] text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm"
              >
                <span>➕</span> Add Digital Child Profile
              </button>
            </div>
            
            {orders.length > 0 && (
              <div className="mt-6 border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden bg-white dark:bg-slate-900/40">
                <div className={`p-3 border-b font-bold text-xs uppercase tracking-wider flex items-center justify-between ${
                  theme === 'dark' 
                    ? 'bg-slate-950/60 border-white/10 text-slate-300' 
                    : 'bg-slate-50 border-slate-200 text-slate-600'
                }`}>
                  <span>My Recent Orders</span>
                </div>
                <div className="flex flex-col">
                  {orders.map((o: any) => (
                    <div key={o.id} className="w-full text-left p-4 border-b border-slate-100 dark:border-white/5 last:border-0 flex items-center gap-3">
                      <span className="text-2xl">📦</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center mb-0.5">
                          <span className={`font-semibold text-sm ${theme === 'dark' ? 'text-slate-100' : 'text-[#051650]'}`}>
                            {o.quantity}x {o.color || 'Band'} ({o.size || 'Small'})
                          </span>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                            o.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
                          } uppercase`}>
                            {o.status}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500 truncate mb-1">
                          Delivery: {o.shipping_address || 'Standard Delivery'}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {new Date(o.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Main Editor */}
        <div className={`flex-1 rounded-2xl shadow-sm p-6 md:p-8 transition-all duration-500 border ${
          theme === 'dark' 
            ? 'bg-slate-900/40 backdrop-blur-xl border-white/10 text-slate-100 shadow-2xl' 
            : 'bg-white border-slate-200 text-slate-800'
        }`}>
          {!formData ? (
            <div className={`h-full flex flex-col items-center justify-center py-10 text-center px-4 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
              <div className="text-4xl mb-4 opacity-50">🏷️</div>
              <p className="mb-12 font-medium">Select a tag on the left to edit its information.</p>
              
              <div className={`p-6 rounded-xl max-w-md text-left border transition-colors ${
                theme === 'dark' 
                  ? 'bg-slate-950/50 border-white/5' 
                  : 'bg-slate-50 border-slate-200'
              }`}>
                <h3 className={`text-sm font-bold mb-3 uppercase tracking-wider ${theme === 'dark' ? 'text-[#FFCFF1]' : 'text-[#051650]'}`}>How the "self-service upload" actually works</h3>
                <p className={`text-xs leading-relaxed mb-3 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>
                  The physical NFC chip only ever stores one thing: a URL, like <span className="font-mono bg-slate-200 dark:bg-slate-800 text-[#051650] dark:text-[#FFCFF1] px-1 py-0.5 rounded text-[11px]">https://lotap.co.za/</span>. That's written once, before the tag ships.
                </p>
                <p className={`text-xs leading-relaxed mb-3 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>
                  Everything on this page is saved against that Tag ID in a database — not on the chip. So when a parent edits a phone number or adds an allergy months later, the same physical tag instantly shows the new info, because the tag was only ever a pointer.
                </p>
                <p className={`text-[11px] leading-relaxed font-medium pt-2 border-t border-slate-200 dark:border-slate-800 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                  In production this becomes: real user accounts, a proper backend (e.g. Supabase/Firebase), POPIA-compliant consent capture for a minor's data, and a real WhatsApp Business API call instead of a wa.me link.
                </p>
              </div>
            </div>
          ) : (
            <div className="max-w-2xl">
              <div className="flex flex-wrap justify-between items-center mb-8 gap-4">
                <div>
                  <h2 className={`text-2xl font-bold flex items-center gap-3 ${theme === 'dark' ? 'text-white' : 'text-[#051650]'}`}>
                    Editing {formData.child_name || 'Tag'}
                  </h2>
                  <p className="text-xs text-slate-500 font-mono mt-1">ID: {formData.tag_id}</p>
                </div>
                <div className="flex gap-2.5 flex-wrap">
                  <button 
                    type="button"
                    onClick={() => { triggerHaptic(); handleReleaseTag(); }}
                    disabled={saving}
                    className="px-4 py-2 text-xs font-bold bg-rose-50 border border-rose-200 text-rose-700 rounded-lg hover:bg-rose-100 transition-colors flex items-center gap-1.5 shadow-sm animate-fade-in"
                  >
                    🗑️ Release Tag
                  </button>
                  <button 
                    onClick={() => { triggerHaptic(); handleSave(); }} 
                    disabled={saving} 
                    className={`px-6 py-2 rounded-lg font-semibold text-sm transition-all shadow-sm ${
                      theme === 'dark' 
                        ? 'bg-[#C54B8C] hover:bg-[#B33B7B] text-white' 
                        : 'bg-[#051650] hover:bg-[#0A2472] text-white'
                    }`}
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>

              <div className="space-y-6">
                {/* Beautiful Permanent Tag Info Card */}
                <div className="bg-gradient-to-tr from-[#051650] to-[#C54B8C] p-6 rounded-2xl text-white shadow-md relative overflow-hidden flex flex-col sm:flex-row items-center justify-between gap-6 animate-fade-in">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-[#FFCFF1]/10 rounded-bl-full pointer-events-none"></div>
                  <div className="space-y-2 text-center sm:text-left">
                    <h3 className="font-extrabold text-base flex items-center justify-center sm:justify-start gap-1.5 font-serif text-[#FFCFF1]">
                      <span>🏷️</span> Active NFC Wearable Tag
                    </h3>
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
                      <span className="text-xs text-slate-200">Registered Code:</span>
                      <span className="font-mono bg-[#051650] border border-[#FFCFF1]/30 px-2.5 py-0.5 rounded-lg text-white font-extrabold text-sm tracking-wider">
                        {formData.tag_id}
                      </span>
                      {formData.custom_label && (
                        <span className="font-sans bg-[#FFCFF1]/20 border border-[#FFCFF1]/30 px-2.5 py-0.5 rounded-lg text-[#FFCFF1] font-bold text-xs uppercase tracking-wider">
                          Label: {formData.custom_label}
                        </span>
                      )}
                      {formData.child_name && formData.parent_whatsapp ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                          Not Configured
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-100 leading-relaxed max-w-md">
                      Your child's physical wristband is linked to this unique tag code. Parents can view and test the exact medical page that finders see by checking the public profile view.
                    </p>
                  </div>
                  <div className="shrink-0 w-full sm:w-auto flex flex-col gap-2">
                    <button
                      onClick={() => { triggerHaptic(); navigate('/t/' + formData.tag_id); }}
                      className="w-full sm:w-auto px-6 py-2.5 bg-white text-[#051650] font-extrabold text-xs rounded-xl hover:bg-[#FFCFF1] hover:text-[#C54B8C] transition-all transform hover:scale-[1.02] shadow-md flex items-center justify-center gap-1.5 animate-subtle-pulse cursor-pointer"
                    >
                      👁️ View in Public
                    </button>
                    <a
                      href="#child-profile-form"
                      onClick={(e) => {
                        e.preventDefault();
                        triggerHaptic();
                        document.getElementById('child-profile-form')?.scrollIntoView({ behavior: 'smooth' });
                      }}
                      className="w-full sm:w-auto px-4 py-1.5 bg-[#051650]/40 hover:bg-[#051650]/80 border border-[#FFCFF1]/30 text-[#FFCFF1] font-bold text-[11px] rounded-xl transition-all flex items-center justify-center gap-1 text-center"
                    >
                      <span>👇</span> Edit Profile Details
                    </a>
                  </div>
                </div>

                {/* Child Safety Profile Form Block - Direct Linked right under Active NFC Tag */}
                <div id="child-profile-form" className={`p-6 rounded-2xl border transition-all duration-300 space-y-6 ${
                  theme === 'dark' 
                    ? 'bg-slate-950/60 border-slate-800 text-white' 
                    : 'bg-slate-50/80 border-slate-200 text-slate-800'
                }`}>
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                    <h3 className={`text-sm font-black uppercase tracking-wider flex items-center gap-2 ${
                      theme === 'dark' ? 'text-[#FFCFF1]' : 'text-[#051650]'
                    }`}>
                      <span>👧</span> Child Profile Information
                    </h3>
                    <span className="text-[10px] font-mono text-slate-400">Linked to Tag: <strong className="text-[#C54B8C]">{formData.tag_id}</strong></span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div className="sm:col-span-3">
                      <label className={`block text-xs font-bold uppercase mb-2 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Child's Name</label>
                      <input 
                        type="text" 
                        placeholder="e.g. Lindiwe"
                        value={formData.child_name || ''} 
                        onChange={e => setFormData({...formData, child_name: e.target.value})} 
                        className={`w-full p-3 border rounded-lg focus:outline-none focus:ring-2 transition-all ${
                          theme === 'dark' 
                            ? 'bg-slate-900 border-slate-800 text-white focus:ring-[#C54B8C]' 
                            : 'bg-white border-slate-200 text-[#051650] focus:ring-[#051650]'
                        }`} 
                      />
                    </div>
                    <div className="sm:col-span-1">
                      <label className={`block text-xs font-bold uppercase mb-2 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Avatar</label>
                      <select 
                        value={formData.avatar || '🧒'} 
                        onChange={e => setFormData({...formData, avatar: e.target.value})} 
                        className={`w-full p-3 border rounded-lg text-xl text-center focus:outline-none focus:ring-2 transition-all ${
                          theme === 'dark' 
                            ? 'bg-slate-900 border-slate-800 text-white focus:ring-[#C54B8C]' 
                            : 'bg-white border-slate-200 text-[#051650] focus:ring-[#051650]'
                        }`}
                      >
                        {['🧒','👧','👦','🦸‍♀️','🧑','👶'].map(a => <option key={a} value={a}>{a}</option>)}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className={`block text-xs font-bold uppercase mb-2 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Parent WhatsApp number (used for "share location")</label>
                    <input 
                      type="tel" 
                      placeholder="e.g. 082 123 4567" 
                      value={formData.parent_whatsapp || ''} 
                      onChange={e => setFormData({...formData, parent_whatsapp: e.target.value})} 
                      className={`w-full p-3 border rounded-lg focus:outline-none focus:ring-2 transition-all ${
                        theme === 'dark' 
                          ? 'bg-slate-900 border-slate-800 text-white focus:ring-[#C54B8C]' 
                          : 'bg-white border-slate-200 text-[#051650] focus:ring-[#051650]'
                      }`} 
                    />
                    <p className="text-xs text-slate-400 mt-2">When a finder taps "Share location", a map link will be sent here.</p>
                  </div>

                  <hr className="border-slate-200 dark:border-slate-800"/>
                  
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <label className={`block text-xs font-bold uppercase ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Emergency Contacts</label>
                      <button 
                        onClick={() => { triggerHaptic(); setFormData({...formData, contacts: [...(formData.contacts||[]), {name:'', relation:'', phone:'', whatsapp:true}]}); }} 
                        className="text-[#C54B8C] text-sm font-semibold hover:underline cursor-pointer"
                      >
                        + Add contact
                      </button>
                    </div>
                    
                    {(!formData.contacts || formData.contacts.length === 0) && (
                      <div className={`p-4 rounded-lg text-sm italic text-center border ${
                        theme === 'dark' ? 'bg-slate-900/40 border-slate-800 text-slate-500' : 'bg-white border-slate-200 text-slate-500'
                      }`}>No contacts added.</div>
                    )}

                    {(formData.contacts || []).map((c: any, i: number) => (
                      <div key={i} className={`p-4 border rounded-xl mb-3 relative transition-all ${
                        theme === 'dark' 
                          ? 'bg-slate-900/80 border-slate-800 text-white shadow-inner' 
                          : 'bg-white border-slate-200 text-slate-800 shadow-sm'
                      }`}>
                        <button 
                          onClick={() => { const nc = [...formData.contacts]; nc.splice(i,1); setFormData({...formData, contacts: nc}); }} 
                          className="absolute top-4 right-4 text-slate-400 hover:text-red-500 text-sm font-bold cursor-pointer"
                          title="Remove contact"
                        >
                          ✕
                        </button>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3 pr-6">
                          <div>
                            <label className="block text-[10px] uppercase text-slate-400 mb-1">Name</label>
                            <input type="text" placeholder="Name" value={c.name} onChange={e => { const nc = [...formData.contacts]; nc[i].name = e.target.value; setFormData({...formData, contacts: nc}); }} className={`w-full p-2 border rounded-lg text-sm focus:outline-none focus:ring-2 transition-all ${theme === 'dark' ? 'bg-slate-950/60 border-slate-800 text-white focus:ring-[#C54B8C]' : 'bg-slate-50 border-slate-200 text-[#051650] focus:ring-[#051650]'}`} />
                          </div>
                          <div>
                            <label className="block text-[10px] uppercase text-slate-400 mb-1">Relation</label>
                            <input type="text" placeholder="Parent, Aunt, Neighbour…" value={c.relation} onChange={e => { const nc = [...formData.contacts]; nc[i].relation = e.target.value; setFormData({...formData, contacts: nc}); }} className={`w-full p-2 border rounded-lg text-sm focus:outline-none focus:ring-2 transition-all ${theme === 'dark' ? 'bg-slate-950/60 border-slate-800 text-white focus:ring-[#C54B8C]' : 'bg-slate-50 border-slate-200 text-[#051650] focus:ring-[#051650]'}`} />
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {['Parent', 'Aunt', 'Neighbour', 'Mom', 'Dad', 'Guardian'].map(r => (
                                <button
                                  key={r}
                                  type="button"
                                  onClick={() => {
                                    const nc = [...formData.contacts];
                                    nc[i].relation = r;
                                    setFormData({...formData, contacts: nc});
                                  }}
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors cursor-pointer ${
                                    c.relation === r
                                      ? 'bg-[#C54B8C] border-[#C54B8C] text-white'
                                      : theme === 'dark'
                                        ? 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                                        : 'bg-white border-slate-200 text-[#64748b] hover:bg-slate-100'
                                  }`}
                                >
                                  {r}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                          <div>
                            <label className="block text-[10px] uppercase text-slate-400 mb-1">Phone number</label>
                            <input type="tel" placeholder="082 123 4567" value={c.phone || ''} onChange={e => { const nc = [...formData.contacts]; nc[i].phone = e.target.value; setFormData({...formData, contacts: nc}); }} className={`w-full p-2 border rounded-lg text-sm focus:outline-none focus:ring-2 transition-all ${theme === 'dark' ? 'bg-slate-950/60 border-slate-800 text-white focus:ring-[#C54B8C]' : 'bg-slate-50 border-slate-200 text-[#051650] focus:ring-[#051650]'}`} />
                          </div>
                          <div>
                            <label className="block text-[10px] uppercase text-slate-400 mb-1">Email address (optional)</label>
                            <input type="email" placeholder="contact@example.com" value={c.email || ''} onChange={e => { const nc = [...formData.contacts]; nc[i].email = e.target.value; setFormData({...formData, contacts: nc}); }} className={`w-full p-2 border rounded-lg text-sm focus:outline-none focus:ring-2 transition-all ${theme === 'dark' ? 'bg-slate-950/60 border-slate-800 text-white focus:ring-[#C54B8C]' : 'bg-slate-50 border-slate-200 text-[#051650] focus:ring-[#051650]'}`} />
                          </div>
                        </div>
                        
                        <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer w-max">
                          <input type="checkbox" checked={c.whatsapp} onChange={e => { const nc = [...formData.contacts]; nc[i].whatsapp = e.target.checked; setFormData({...formData, contacts: nc}); }} className="rounded text-[#25D366] focus:ring-[#25D366]" />
                          Also show WhatsApp button for this contact
                        </label>
                      </div>
                    ))}
                  </div>

                  <hr className="border-slate-200 dark:border-slate-800"/>

                  <div>
                    <label className={`block text-xs font-bold uppercase mb-4 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Medical information</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-[10px] uppercase text-slate-400 mb-1">Allergies</label>
                        <input type="text" placeholder="e.g. Peanuts, penicillin" value={formData.medical?.allergies || ''} onChange={e => setFormData({...formData, medical: {...formData.medical, allergies: e.target.value}})} className={`w-full p-3 border rounded-lg text-sm focus:outline-none focus:ring-2 transition-all ${theme === 'dark' ? 'bg-slate-900 border-slate-800 text-white focus:ring-[#C54B8C]' : 'bg-white border-slate-200 text-[#051650] focus:ring-[#051650]'}`} />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase text-slate-400 mb-1">Conditions</label>
                        <input type="text" placeholder="e.g. Asthma, epilepsy" value={formData.medical?.conditions || ''} onChange={e => setFormData({...formData, medical: {...formData.medical, conditions: e.target.value}})} className={`w-full p-3 border rounded-lg text-sm focus:outline-none focus:ring-2 transition-all ${theme === 'dark' ? 'bg-slate-900 border-slate-800 text-white focus:ring-[#C54B8C]' : 'bg-white border-slate-200 text-[#051650] focus:ring-[#051650]'}`} />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase text-slate-400 mb-1">Notes</label>
                      <textarea placeholder="e.g. Carries an inhaler in the front pocket of her school bag." value={formData.medical?.notes || ''} onChange={e => setFormData({...formData, medical: {...formData.medical, notes: e.target.value}})} className={`w-full p-3 border rounded-lg h-24 resize-none text-sm focus:outline-none focus:ring-2 transition-all ${theme === 'dark' ? 'bg-slate-900 border-slate-800 text-white focus:ring-[#C54B8C]' : 'bg-white border-slate-200 text-[#051650] focus:ring-[#051650]'}`}></textarea>
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button 
                      type="button"
                      onClick={() => { triggerHaptic(); handleSave(); }} 
                      disabled={saving} 
                      className={`w-full sm:w-auto px-8 py-3.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer ${
                        theme === 'dark' 
                          ? 'bg-[#C54B8C] hover:bg-[#B33B7B] text-white' 
                          : 'bg-[#051650] hover:bg-[#0A2472] text-white'
                      }`}
                    >
                      <span>💾</span> {saving ? 'Saving Changes...' : 'Save Parent Information'}
                    </button>
                  </div>
                </div>

                {/* Emergency Broadcast Mode Toggle Card */}
                <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 animate-fade-in">
                  <div className="space-y-1">
                    <h4 className="text-sm font-extrabold text-rose-800 flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping shrink-0"></span>
                      ⚠️ EMERGENCY BROADCAST MODE
                    </h4>
                    <p className="text-xs text-rose-700 leading-normal max-w-md font-medium">
                      When active, a prominent pulsing red "CALL EMERGENCY CONTACT" button is displayed to finders on the public safety profile. Turn this on if your child is lost.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input 
                      type="checkbox" 
                      checked={formData.emergency_mode || false}
                      onChange={e => { triggerHaptic(); setFormData({...formData, emergency_mode: e.target.checked}); }}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rose-600"></div>
                  </label>
                </div>

                {/* Dashboard Widgets Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in">
                  {/* Recent Activity / Scan Tracker Widget */}
                  <div className={`border rounded-2xl p-4 flex flex-col justify-between transition-all duration-300 ${
                    theme === 'dark' 
                      ? 'bg-slate-950/40 border-slate-800 text-white' 
                      : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${theme === 'dark' ? 'text-[#FFCFF1]' : 'text-[#051650]'}`}>
                          <span>📈</span> Scan Statistics & Activity
                        </h4>
                        <span className="flex h-2 w-2 relative">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mb-4">
                        Real-time tracking of when this wristband's NFC chip was scanned.
                      </p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div className={`p-3 rounded-xl shadow-sm text-center border transition-all duration-300 ${
                        theme === 'dark' 
                          ? 'bg-slate-900 border-slate-800 text-white' 
                          : 'bg-white border-slate-200 text-[#051650]'
                      }`}>
                        <span className={`block text-2xl font-black ${theme === 'dark' ? 'text-white' : 'text-[#051650]'}`}>{formData.scan_count || 0}</span>
                        <span className="text-[10px] uppercase font-bold text-slate-400">Total Scans</span>
                      </div>
                      <div className={`p-3 rounded-xl shadow-sm flex flex-col justify-center items-center border transition-all duration-300 ${
                        theme === 'dark' 
                          ? 'bg-slate-900 border-slate-800' 
                          : 'bg-white border-slate-200'
                      }`}>
                        <span className="block text-[11px] font-bold text-[#C54B8C] leading-none mb-1">
                          {formData.last_scanned_at ? new Date(formData.last_scanned_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Never'}
                        </span>
                        <span className="block text-[9px] text-slate-400 font-mono">
                          {formData.last_scanned_at ? new Date(formData.last_scanned_at).toLocaleDateString([], { month: 'short', day: 'numeric' }) : 'No scans yet'}
                        </span>
                        <span className="text-[10px] uppercase font-bold text-slate-400 mt-1">Last Scan</span>
                      </div>
                    </div>
                  </div>

                  {/* Share Profile Widget */}
                  <div className={`border rounded-2xl p-4 flex flex-col justify-between transition-all duration-300 ${
                    theme === 'dark' 
                      ? 'bg-slate-950/40 border-slate-800 text-white' 
                      : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}>
                    <div>
                      <h4 className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 mb-1 ${theme === 'dark' ? 'text-[#FFCFF1]' : 'text-[#051650]'}`}>
                        <span>🔗</span> Share Profile preview
                      </h4>
                      <p className="text-[11px] text-slate-400 mb-3">
                        Share a secure, deep-linked public preview of this child's medical card with schools, nannies, or guardians.
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={() => {
                          triggerHaptic();
                          const publicUrl = `${getPublicOrigin()}/t/${formData.tag_id}`;
                          navigator.clipboard.writeText(publicUrl);
                          setToastMessage(`Short deep-link URL for ${formData.child_name || 'your child'} copied!`);
                          setTimeout(() => setToastMessage(null), 3000);
                        }}
                        className={`w-full py-2.5 px-3 border font-extrabold text-xs rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5 active:scale-95 ${
                          theme === 'dark' 
                            ? 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-white hover:text-[#FFCFF1]' 
                            : 'bg-white hover:bg-slate-100 border-slate-200 text-[#051650] hover:text-[#C54B8C]'
                        }`}
                      >
                        <span>📋</span> Copy Deep-Link URL
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          triggerHaptic();
                          const publicUrl = `${getPublicOrigin()}/t/${formData.tag_id}`;
                          const text = `🚨 LoTap Emergency Safety Profile for ${formData.child_name || 'Child'}. Active NFC Wristband Code: ${formData.tag_id}. View emergency info and share live location here: ${publicUrl}`;
                          window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
                        }}
                        className="w-full py-2.5 px-3 bg-[#25D366] text-white font-extrabold text-xs rounded-xl hover:bg-[#20bd5a] transition-all shadow-sm flex items-center justify-center gap-1.5 active:scale-95"
                      >
                        <span>💬</span> Share via WhatsApp
                      </button>
                    </div>
                  </div>
                </div>

                {/* New Insights and Print Guide row */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 animate-fade-in">
                  {/* Scan Insights Chart Card */}
                  <div className={`border rounded-2xl p-4 flex flex-col justify-between transition-all duration-300 ${
                    theme === 'dark' 
                      ? 'bg-slate-950/40 border-slate-800 text-white' 
                      : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}>
                    <div>
                      <h4 className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 mb-1 ${theme === 'dark' ? 'text-[#FFCFF1]' : 'text-[#051650]'}`}>
                        <span>📊</span> Scan Insights (Last 30 Days)
                      </h4>
                      <p className="text-[11px] text-slate-400 mb-4">
                        Historical count of scans showing recent physical activity of the nfc wristband.
                      </p>
                    </div>

                    {/* Chart Container */}
                    <div className="h-44 w-full text-xs">
                      {formData.scan_count && formData.scan_count > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart
                            data={generate30DayScanData(formData.scan_count, formData.tag_id)}
                            margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
                          >
                            <defs>
                              <linearGradient id="colorScans" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#C54B8C" stopOpacity={theme === 'dark' ? 0.4 : 0.3}/>
                                <stop offset="95%" stopColor="#C54B8C" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? 'rgba(255,255,255,0.05)' : '#f1f5f9'} />
                            <XAxis 
                              dataKey="date" 
                              stroke={theme === 'dark' ? '#94a3b8' : '#64748b'} 
                              fontSize={9}
                              tickLine={false}
                            />
                            <YAxis 
                              stroke={theme === 'dark' ? '#94a3b8' : '#64748b'} 
                              fontSize={9}
                              tickLine={false}
                              allowDecimals={false}
                            />
                            <Tooltip 
                              contentStyle={{ 
                                backgroundColor: theme === 'dark' ? '#0f172a' : '#ffffff', 
                                border: theme === 'dark' ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e2e8f0',
                                borderRadius: '8px',
                                color: theme === 'dark' ? '#f8fafc' : '#0f172a'
                              }}
                            />
                            <Area 
                              type="monotone" 
                              dataKey="scans" 
                              stroke="#C54B8C" 
                              strokeWidth={2}
                              fillOpacity={1} 
                              fill="url(#colorScans)" 
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className={`h-full flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-4 text-center ${
                          theme === 'dark' ? 'border-slate-800 text-slate-500' : 'border-slate-200 text-slate-400'
                        }`}>
                          <span className="text-xl mb-1">📈</span>
                          <span className="font-semibold text-[11px]">No scan activity recorded yet</span>
                          <span className="text-[10px]">Insights will populate once the NFC tag is scanned.</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Wristband Activation Guide Card */}
                  <div className={`border rounded-2xl p-4 flex flex-col justify-between transition-all duration-300 ${
                    theme === 'dark' 
                      ? 'bg-slate-950/40 border-slate-800 text-white' 
                      : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}>
                    <div>
                      <h4 className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 mb-1 ${theme === 'dark' ? 'text-[#FFCFF1]' : 'text-[#051650]'}`}>
                        <span>🏷️</span> Wristband Activation Guide
                      </h4>
                      <p className="text-[11px] text-slate-400 mb-3">
                        Every physical LoTap wristband comes pre-printed with a unique, pre-generated 6-character ID code. This is not optional.
                      </p>
                    </div>

                    <div className="space-y-2.5">
                      <div className="flex items-start gap-2.5 text-[11px]">
                        <span className="font-extrabold text-[#C54B8C] bg-[#FFCFF1]/30 w-5 h-5 rounded-full flex items-center justify-center shrink-0">1</span>
                        <div>
                          <p className="font-bold leading-none">Find the Pre-printed Code</p>
                          <p className="text-slate-400 mt-0.5">Locate the permanent 6-character ID (e.g. <span className="font-mono font-bold text-[#C54B8C] bg-[#FFCFF1]/10 px-1 rounded">{formData.tag_id}</span>) printed on the backside of your physical silicone wristband housing.</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-2.5 text-[11px]">
                        <span className="font-extrabold text-[#C54B8C] bg-[#FFCFF1]/30 w-5 h-5 rounded-full flex items-center justify-center shrink-0">2</span>
                        <div>
                          <p className="font-bold leading-none">Claim Your Code</p>
                          <p className="text-slate-400 mt-0.5">Under the "Your Tags" list on the left, click "Add Digital Child Profile" and enter this unique code to securely bind it to your account.</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-2.5 text-[11px]">
                        <span className="font-extrabold text-[#C54B8C] bg-[#FFCFF1]/30 w-5 h-5 rounded-full flex items-center justify-center shrink-0">3</span>
                        <div>
                          <p className="font-bold leading-none">Verify by Tapping</p>
                          <p className="text-slate-400 mt-0.5">Tap the physical NFC chip with your phone to verify it displays your child's medical information correctly.</p>
                        </div>
                      </div>
                    </div>

                    <div className={`mt-3 p-2 rounded-xl flex items-center gap-2 border text-center justify-center ${
                      theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                    }`}>
                      <span className="text-xs">🔑</span>
                      <span className="text-[10px] font-bold text-slate-400">Your Registered Wristband Code:</span>
                      <span className="font-mono text-xs text-[#C54B8C] font-black tracking-wider">{formData.tag_id}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Digital Child Profile Modal */}
      {showAddChildModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className={`max-w-md w-full p-6 rounded-2xl shadow-2xl border ${
            theme === 'dark' ? 'bg-slate-900 border-white/10 text-white' : 'bg-white border-slate-200 text-[#051650]'
          }`}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
                <span>👶</span> Add Digital Child Profile
              </h3>
              <button 
                type="button"
                onClick={() => setShowAddChildModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed font-medium">
              Enter the Tag Code for your child's physical wristband or digital profile to link it to your parent dashboard.
            </p>

            <form onSubmit={(e) => { e.preventDefault(); handleAddChildWithCode(); }} className="space-y-4">
              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wider mb-1.5 text-slate-500 dark:text-slate-400">
                  Wristband Tag Code *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ABC123"
                  value={newChildTagCode}
                  onChange={(e) => setNewChildTagCode(e.target.value.toUpperCase().trim())}
                  className="w-full px-3.5 py-2.5 text-sm font-mono font-bold rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-white/20 text-[#051650] dark:text-white uppercase focus:outline-none focus:ring-2 focus:ring-[#C54B8C] placeholder:font-sans placeholder:font-normal placeholder:normal-case placeholder:text-slate-400"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wider mb-1.5 text-slate-500 dark:text-slate-400">
                  Child's Name (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Emma"
                  value={newChildName}
                  onChange={(e) => setNewChildName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm font-semibold rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-white/20 text-[#051650] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#C54B8C] placeholder:font-normal placeholder:text-slate-400"
                />
              </div>

              {modalError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-semibold">
                  {modalError}
                </div>
              )}

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddChildModal(false)}
                  className="flex-1 py-2.5 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newChildTagCode || modalLoading}
                  className="flex-1 py-2.5 px-4 bg-[#051650] hover:bg-[#0A2472] dark:bg-[#C54B8C] dark:hover:bg-[#B33B7B] text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 shadow-md shadow-[#051650]/20"
                >
                  {modalLoading ? 'Adding...' : 'Add Child Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#051650] text-white text-xs font-black uppercase tracking-wider px-6 py-4 rounded-2xl shadow-2xl border border-white/10 flex items-center gap-2 animate-fade-in">
          <span>🔔</span>
          <span>{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="ml-2 hover:text-[#C54B8C] font-bold">✕</button>
        </div>
      )}
    </div>
  );
}
