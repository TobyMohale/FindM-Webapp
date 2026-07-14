import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase, hasRealSupabase, isForcedMock, setForcedMock, generateId } from '../lib/supabase';

export default function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<any>(null);
  
  const [tagToClaim, setTagToClaim] = useState('');
  const [activeTagId, setActiveTagId] = useState<string | null>(null);
  const [tags, setTags] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  // Form State
  const [formData, setFormData] = useState<any>(null);
  
  // Auth Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [popiaConsent, setPopiaConsent] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authMsg, setAuthMsg] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);

  // Onboarding / SignUp Wizard State
  const [signUpStep, setSignUpStep] = useState(1);
  const [childName, setChildName] = useState('Emma');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [registeredTagId, setRegisteredTagId] = useState<string | null>(null);

  useEffect(() => {
    // Check if we arrived via a claim route (/claim/:tag_id)
    const match = location.pathname.match(/^\/claim\/(.+)$/);
    if (match && match[1]) {
      setTagToClaim(match[1]);
    }
  }, [location.pathname]);

  useEffect(() => {
    const loadData = async () => {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      setUser(currentUser);
      
      if (currentUser) {
        await fetchUserTags(currentUser.id);
      }
    };
    loadData();
  }, []);

  const fetchUserTags = async (userId: string) => {
    const { data } = await supabase.from('tags').select('*').eq('owner_id', userId);
    if (data) {
      setTags(data);
      // Auto-select first tag if none active
      if (data.length > 0 && !activeTagId) {
        loadTagForEdit(data[0]);
      }
    }
  };

  const loadTagForEdit = (tag: any) => {
    setActiveTagId(tag.tag_id);
    setFormData(JSON.parse(JSON.stringify(tag)));
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthMsg('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setAuthMsg(error.message || 'Invalid login details.');
    } else {
      setAuthMsg('Logged in successfully!');
      window.location.reload();
    }
    setAuthLoading(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setAuthMsg('Please enter your email address to receive a reset link.');
      return;
    }
    setAuthLoading(true);
    setAuthMsg('');
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
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

  const handleSignUpNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setAuthMsg('Please enter a valid email address.');
      return;
    }
    if (!popiaConsent) {
      setAuthMsg('You must accept the POPIA data privacy consent to proceed.');
      return;
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
      email,
      password,
      options: {
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

    // 2. Generate and claim a unique tag for their child
    const newTagId = generateId();
    
    const tagPayload = {
      tag_id: newTagId,
      owner_id: registeredUser.id,
      child_name: childName || 'Emma',
      avatar: '👧',
      parent_whatsapp: '',
      contacts: [],
      medical: { allergies: '', conditions: '', notes: '' },
      claimed_at: new Date().toISOString()
    };

    const { error: insertError } = await supabase.from('tags').insert(tagPayload);
    
    if (insertError) {
      console.error('Error inserting auto-generated tag:', insertError);
    }

    // Move to step 3: Celebratory scannable QR layout
    setRegisteredTagId(newTagId);
    setSignUpStep(3);
    setAuthLoading(false);
  };

  const handleFinishOnboarding = () => {
    window.location.reload();
  };

  const handleDemoBypass = () => {
    setForcedMock(true);
    // Log in the mock user
    localStorage.setItem('findme_session', 'true');
    window.location.reload();
  };

  const handleClaimTag = async () => {
    if (!tagToClaim) return;
    setSaving(true);
    // Attempt to update where owner_id is null
    const { data, error } = await supabase.from('tags').update({ owner_id: user.id }).eq('tag_id', tagToClaim);
    
    if (error) {
      alert('Could not claim tag. It may be invalid or already claimed.');
    } else {
      setTagToClaim('');
      // Refresh list
      const { data: newTags } = await supabase.from('tags').select('*').eq('owner_id', user.id);
      if (newTags) {
        setTags(newTags);
        const claimedTag = newTags.find((t: any) => t.tag_id === tagToClaim) || newTags[newTags.length - 1];
        if (claimedTag) loadTagForEdit(claimedTag);
      }
    }
    setSaving(false);
    navigate('/dashboard', { replace: true });
  };

  const handleSave = async () => {
    if (!activeTagId || !formData) return;
    setSaving(true);
    
    // Clean up payload before sending
    const payload = {
      child_name: formData.child_name,
      avatar: formData.avatar,
      parent_whatsapp: formData.parent_whatsapp,
      contacts: formData.contacts,
      medical: formData.medical
    };
    
    await supabase.from('tags').update(payload).eq('tag_id', activeTagId);
    await fetchUserTags(user.id);
    
    setTimeout(() => setSaving(false), 500); // UI feedback
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
                  Step {signUpStep} of 3: {signUpStep === 1 ? 'Profile setup' : signUpStep === 2 ? 'Security verification' : 'QR generated'}
                </span>
                <div className="flex gap-1">
                  <div className={`w-6 h-1.5 rounded-full transition-all duration-300 ${signUpStep >= 1 ? 'bg-[#C54B8C]' : 'bg-slate-200'}`}></div>
                  <div className={`w-6 h-1.5 rounded-full transition-all duration-300 ${signUpStep >= 2 ? 'bg-[#C54B8C]' : 'bg-slate-200'}`}></div>
                  <div className={`w-6 h-1.5 rounded-full transition-all duration-300 ${signUpStep >= 3 ? 'bg-[#C54B8C]' : 'bg-slate-200'}`}></div>
                </div>
              </div>

              {/* STEP 1: Email & Child's Name */}
              {signUpStep === 1 && (
                <form onSubmit={handleSignUpNext} className="space-y-4">
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
                      <strong>POPIA Consent:</strong> I consent to the secure storage of child safety details. This data is only accessible publicly when someone scans the physical wristband's QR code.
                    </label>
                  </div>

                  <button 
                    type="submit"
                    disabled={!email || !childName || !popiaConsent}
                    className="w-full bg-[#051650] text-white p-4 rounded-xl font-bold uppercase tracking-wide hover:bg-[#0A2472] transition-colors disabled:opacity-50 shadow-md shadow-[#051650]/15 mt-2 flex items-center justify-center gap-2"
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
                      {authLoading ? 'Registering...' : 'Confirm & Generate QR Code'}
                    </button>
                  </div>

                  {authMsg && (
                    <div className="mt-3 p-3 rounded-xl text-xs bg-red-50 border border-red-200 text-red-700 font-semibold">
                      {authMsg}
                    </div>
                  )}
                </form>
              )}

              {/* STEP 3: Celebratory Unique QR Code Screen */}
              {signUpStep === 3 && registeredTagId && (
                <div className="text-center space-y-6 pt-2">
                  <div className="w-16 h-16 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto text-3xl shadow-sm border border-green-100 animate-bounce">
                    🎉
                  </div>
                  
                  <div>
                    <h3 className="text-xl font-black text-[#051650] font-serif">Account Created!</h3>
                    <p className="text-xs text-slate-500 mt-1">Your child's unique safety code has been registered.</p>
                  </div>

                  {/* Gorgeous printable wristband card */}
                  <div className="p-5 bg-gradient-to-tr from-[#051650] to-[#C54B8C] rounded-3xl text-white shadow-xl relative overflow-hidden border-2 border-[#FFCFF1]/30">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-[#FFCFF1]/10 rounded-bl-full pointer-events-none"></div>
                    
                    <div className="flex justify-between items-center mb-3 text-left">
                      <div>
                        <span className="text-[9px] font-black tracking-widest uppercase text-[#FFCFF1]">Child Safety Wearable</span>
                        <h4 className="font-extrabold text-sm flex items-center gap-1">
                          <span>👧</span> {childName}
                        </h4>
                      </div>
                      <div className="bg-white/10 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider text-[#FFCFF1]">
                        ID: {registeredTagId}
                      </div>
                    </div>

                    {/* Scannable QR Code */}
                    <div className="bg-white p-4 rounded-2xl inline-block shadow-lg border border-white/20 mx-auto">
                      <img 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(window.location.origin + '/t/' + registeredTagId)}&color=051650`}
                        alt="Unique Child Wristband QR Code"
                        className="w-40 h-40 object-contain mx-auto"
                        onError={(e) => {
                          // Fallback dynamic canvas rendering if API goes offline
                          console.warn('QR code API error, using static fallback');
                        }}
                      />
                    </div>

                    <div className="mt-3 text-center">
                      <p className="text-[10px] font-medium text-slate-200 leading-relaxed">
                        This custom scannable code is permanently linked to <span className="font-mono bg-[#051650]/40 px-1 py-0.5 rounded text-white">{registeredTagId}</span>. Attach it to your child's wristband, schoolbag, or clothing.
                      </p>
                    </div>
                  </div>

                  <p className="text-xs text-slate-500 font-medium">
                    You can print or download this QR code anytime from your dashboard. Let's configure your contact details and safety profile next!
                  </p>

                  <button 
                    onClick={handleFinishOnboarding}
                    className="w-full bg-[#051650] text-white p-4 rounded-xl font-bold uppercase tracking-wide hover:bg-[#0A2472] transition-colors shadow-md shadow-[#051650]/15"
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

          {/* Demo Bypass button */}
          {(!isSignUp || signUpStep !== 3) && (
            <div className="mt-6 pt-5 border-t border-slate-100 flex flex-col items-center relative z-10">
              <span className="text-[11px] text-slate-400 mb-2.5 font-medium">Want to bypass password auth in preview?</span>
              <button
                type="button"
                onClick={handleDemoBypass}
                className="w-full py-2.5 px-4 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-2 shadow-sm"
              >
                <span>⚡</span> One-Click Demo Bypass (Instant Parent View)
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-64px)] bg-slate-50 p-4 md:p-8">
      <div className="max-w-5xl mx-auto flex flex-col md:flex-row gap-8">
        
        {/* Sidebar */}
        <div className="w-full md:w-72 shrink-0">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-xl font-black font-serif text-[#051650]">LoTap</h1>
              <p className="text-xs text-slate-500">Parent Dashboard</p>
            </div>
            <button onClick={handleLogout} className="text-xs text-slate-500 hover:text-slate-800 underline">Logout</button>
          </div>

          {isForcedMock() && hasRealSupabase && (
            <div className="mb-6 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 leading-relaxed shadow-sm">
              <p className="font-bold mb-1">⚡ Running in Demo Mock Mode</p>
              <p className="mb-2 text-[11px] text-amber-700">Email rate limit was bypassed. Data is saved in your local browser storage.</p>
              <button 
                onClick={() => { setForcedMock(false); localStorage.removeItem('findme_session'); window.location.reload(); }}
                className="w-full py-1 bg-[#051650] text-white font-bold rounded text-[10px] uppercase tracking-wider hover:bg-[#0A2472] transition-colors"
              >
                Reconnect Real Supabase
              </button>
            </div>
          )}

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-6">
            <div className="bg-slate-50 p-3 border-b border-slate-200 font-bold text-xs uppercase tracking-wider text-slate-600">Your Tags</div>
            {tags.length === 0 ? (
              <div className="p-6 text-center text-sm text-slate-500">No tags claimed yet.</div>
            ) : (
              tags.map((t: any) => (
                <button 
                  key={t.tag_id}
                  onClick={() => loadTagForEdit(t)}
                  className={`w-full text-left p-4 border-b border-slate-100 flex items-center gap-3 transition-colors ${activeTagId === t.tag_id ? 'bg-[#FFCFF1] border-l-4 border-l-[#C54B8C]' : 'hover:bg-slate-50 border-l-4 border-l-transparent'}`}
                >
                  <span className="text-2xl">{t.avatar || '🧒'}</span>
                  <div>
                    <div className="font-semibold text-sm text-[#051650]">{t.child_name || 'Unnamed Tag'}</div>
                    <div className="text-xs text-slate-400 font-mono">{t.tag_id}</div>
                  </div>
                </button>
              ))
            )}
          </div>

          <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
            <h3 className="text-xs font-bold uppercase text-slate-600 mb-3">Claim a new tag</h3>
            <p className="text-xs text-slate-500 mb-3 leading-relaxed">Have a new physical tag? Enter the 6-character code here to bind it to your account.</p>
            <input 
              type="text" 
              placeholder="e.g. abc123" 
              value={tagToClaim}
              onChange={(e) => setTagToClaim(e.target.value)}
              className="w-full p-2 text-sm border border-slate-300 rounded-lg mb-3 font-mono focus:outline-none focus:ring-2 focus:ring-[#051650]"
            />
            <button 
              onClick={handleClaimTag} 
              disabled={!tagToClaim || saving} 
              className="w-full bg-[#051650] text-white p-2.5 rounded-lg text-sm font-semibold hover:bg-[#0A2472] transition-colors disabled:opacity-50"
            >
              Claim Tag
            </button>
          </div>
        </div>

        {/* Main Editor */}
        <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8">
          {!formData ? (
            <div className="h-full flex flex-col items-center justify-center py-10 text-slate-500 text-center px-4">
              <div className="text-4xl mb-4 opacity-50">🏷️</div>
              <p className="mb-12 font-medium">Select a tag on the left to edit its information.</p>
              
              <div className="bg-slate-50 border border-slate-200 p-6 rounded-xl max-w-md text-left">
                <h3 className="text-sm font-bold text-[#051650] mb-3 uppercase tracking-wider">How the "self-service upload" actually works</h3>
                <p className="text-sm leading-relaxed mb-4">
                  The physical NFC chip only ever stores one thing: a URL, like <span className="font-mono bg-slate-200 text-[#C54B8C] px-1 py-0.5 rounded text-xs">lotap.co.za/t/8f3k2p</span>. That's written once, before the tag ships.
                </p>
                <p className="text-sm leading-relaxed mb-4">
                  Everything on this page is saved against that Tag ID in a database — not on the chip. So when a parent edits a phone number or adds an allergy months later, the same physical tag instantly shows the new info, because the tag was only ever a pointer.
                </p>
                <p className="text-xs text-slate-400 italic">
                  In production this uses real user accounts, a proper Supabase backend, POPIA-compliant consent capture, and RLS security policies.
                </p>
              </div>
            </div>
          ) : (
            <div className="max-w-2xl">
              <div className="flex flex-wrap justify-between items-center mb-8 gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-[#051650] flex items-center gap-3">
                    Editing {formData.child_name || 'Tag'}
                  </h2>
                  <p className="text-xs text-slate-500 font-mono mt-1">ID: {formData.tag_id}</p>
                </div>
                <div className="flex gap-3">
                  <button 
                    onClick={() => window.open(`/t/${formData.tag_id}`, '_blank')}
                    className="px-4 py-2 text-sm border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 font-medium transition-colors"
                  >
                    View Public Page
                  </button>
                  <button 
                    onClick={handleSave} 
                    disabled={saving} 
                    className="px-6 py-2 bg-[#051650] text-white rounded-lg font-semibold text-sm hover:bg-[#0A2472] transition-colors"
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>

              <div className="space-y-8">
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div className="sm:col-span-3">
                    <label className="block text-xs font-bold uppercase text-slate-500 mb-2">Child's Name</label>
                    <input 
                      type="text" 
                      value={formData.child_name || ''} 
                      onChange={e => setFormData({...formData, child_name: e.target.value})} 
                      className="w-full p-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#051650]" 
                    />
                  </div>
                  <div className="sm:col-span-1">
                    <label className="block text-xs font-bold uppercase text-slate-500 mb-2">Avatar</label>
                    <select 
                      value={formData.avatar || '🧒'} 
                      onChange={e => setFormData({...formData, avatar: e.target.value})} 
                      className="w-full p-3 border border-slate-200 rounded-lg text-xl text-center focus:outline-none focus:ring-2 focus:ring-[#051650]"
                    >
                      {['🦸‍♀️','🧒','👧','👦','🧑','👶'].map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-2">Parent WhatsApp (For Location Alerts)</label>
                  <input 
                    type="tel" 
                    placeholder="e.g. 082 123 4567" 
                    value={formData.parent_whatsapp || ''} 
                    onChange={e => setFormData({...formData, parent_whatsapp: e.target.value})} 
                    className="w-full p-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#051650]" 
                  />
                  <p className="text-xs text-slate-500 mt-2">When a finder taps "Share location", a map link will be sent here.</p>
                </div>

                <hr className="border-slate-100"/>
                
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <label className="block text-xs font-bold uppercase text-slate-500">Emergency Contacts</label>
                    <button 
                      onClick={() => setFormData({...formData, contacts: [...(formData.contacts||[]), {name:'', relation:'', phone:'', whatsapp:true}]})} 
                      className="text-[#C54B8C] text-sm font-semibold hover:underline"
                    >
                      + Add Contact
                    </button>
                  </div>
                  
                  {(!formData.contacts || formData.contacts.length === 0) && (
                    <div className="p-4 bg-slate-50 rounded-lg text-sm text-slate-500 italic text-center">No contacts added.</div>
                  )}

                  {(formData.contacts || []).map((c: any, i: number) => (
                    <div key={i} className="p-4 border border-slate-200 rounded-xl mb-3 relative bg-slate-50/50">
                      <button 
                        onClick={() => { const nc = [...formData.contacts]; nc.splice(i,1); setFormData({...formData, contacts: nc}); }} 
                        className="absolute top-4 right-4 text-slate-400 hover:text-red-500 text-sm font-bold"
                        title="Remove contact"
                      >
                        ✕
                      </button>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3 pr-6">
                        <div>
                          <label className="block text-[10px] uppercase text-slate-500 mb-1">Name</label>
                          <input type="text" placeholder="e.g. Thandeka" value={c.name} onChange={e => { const nc = [...formData.contacts]; nc[i].name = e.target.value; setFormData({...formData, contacts: nc}); }} className="w-full p-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#051650]" />
                        </div>
                        <div>
                          <label className="block text-[10px] uppercase text-slate-500 mb-1">Relation</label>
                          <input type="text" placeholder="e.g. Mom" value={c.relation} onChange={e => { const nc = [...formData.contacts]; nc[i].relation = e.target.value; setFormData({...formData, contacts: nc}); }} className="w-full p-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#051650]" />
                        </div>
                      </div>
                      
                      <div className="mb-3">
                        <label className="block text-[10px] uppercase text-slate-500 mb-1">Phone Number</label>
                        <input type="tel" placeholder="e.g. 082 123 4567" value={c.phone} onChange={e => { const nc = [...formData.contacts]; nc[i].phone = e.target.value; setFormData({...formData, contacts: nc}); }} className="w-full p-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#051650]" />
                      </div>
                      
                      <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer w-max">
                        <input type="checkbox" checked={c.whatsapp} onChange={e => { const nc = [...formData.contacts]; nc[i].whatsapp = e.target.checked; setFormData({...formData, contacts: nc}); }} className="rounded text-[#25D366] focus:ring-[#25D366]" />
                        Enable WhatsApp Button
                      </label>
                    </div>
                  ))}
                </div>

                <hr className="border-slate-100"/>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-4">Medical Information</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-[10px] uppercase text-slate-500 mb-1">Allergies</label>
                      <input type="text" placeholder="e.g. Peanuts, Penicillin" value={formData.medical?.allergies || ''} onChange={e => setFormData({...formData, medical: {...formData.medical, allergies: e.target.value}})} className="w-full p-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#051650]" />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase text-slate-500 mb-1">Conditions</label>
                      <input type="text" placeholder="e.g. Asthma, Epilepsy" value={formData.medical?.conditions || ''} onChange={e => setFormData({...formData, medical: {...formData.medical, conditions: e.target.value}})} className="w-full p-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#051650]" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase text-slate-500 mb-1">Additional Notes</label>
                    <textarea placeholder="e.g. Carries an inhaler in the front pocket of her school bag." value={formData.medical?.notes || ''} onChange={e => setFormData({...formData, medical: {...formData.medical, notes: e.target.value}})} className="w-full p-3 border border-slate-200 rounded-lg h-24 resize-none text-sm focus:outline-none focus:ring-2 focus:ring-[#051650]"></textarea>
                  </div>
                </div>
                
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
