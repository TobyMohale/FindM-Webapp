import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase, hasRealSupabase, isForcedMock, setForcedMock } from '../lib/supabase';

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
  const [popiaConsent, setPopiaConsent] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authMsg, setAuthMsg] = useState('');

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
    if (!popiaConsent) return;
    setAuthLoading(true);
    setAuthMsg('');
    const { error } = await supabase.auth.signInWithOtp({ email });
    if (error) {
      setAuthMsg(error.message);
    } else {
      setAuthMsg('Check your email for the magic link!');
      // In our robust mock or forced mock, it auto logs in, so we just reload.
      if (!import.meta.env.VITE_SUPABASE_URL || isForcedMock()) {
        window.location.reload();
      }
    }
    setAuthLoading(false);
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
      <div className="min-h-[calc(100vh-64px)] bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
          <div className="w-12 h-12 bg-[#F5EAF1] text-[#E23F84] rounded-xl flex items-center justify-center font-serif font-bold text-2xl mb-4">
            F
          </div>
          <h2 className="text-2xl font-bold text-[#16305C] mb-2">Welcome to FindMe</h2>
          <p className="text-slate-500 mb-6 text-sm">Register to manage your child's safety tag. A magic link will be sent to your email.</p>
          
          <form onSubmit={handleLogin}>
            <input 
              type="email" 
              placeholder="Email address" 
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full p-3 border border-slate-300 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-[#16305C]" 
            />
            
            <div className="flex items-start gap-3 mb-6 bg-slate-50 p-3 border border-slate-200 rounded-lg">
              <input 
                type="checkbox" 
                id="popia" 
                required
                checked={popiaConsent}
                onChange={e => setPopiaConsent(e.target.checked)}
                className="mt-1 shrink-0 w-4 h-4 text-[#16305C] rounded" 
              />
              <label htmlFor="popia" className="text-xs text-slate-600 leading-relaxed cursor-pointer">
                <strong>Required Consent:</strong> I explicitly consent to the processing and storage of this minor's personal and medical data under the Protection of Personal Information Act (POPIA). I understand this data is stored securely and only accessible via physical NFC tap.
              </label>
            </div>
            
            <button 
              type="submit"
              disabled={authLoading || !popiaConsent || !email}
              className="w-full bg-[#16305C] text-white p-3 rounded-lg font-bold hover:bg-[#3E5B85] transition-colors disabled:opacity-50"
            >
              {authLoading ? 'Sending...' : 'Send Magic Link'}
            </button>
            
            {authMsg && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm leading-relaxed">
                <p className="font-semibold mb-1">Authorization Message / Error:</p>
                <p className="text-xs text-red-600 mb-2">{authMsg}</p>
                {authMsg.toLowerCase().includes('rate limit') && (
                  <p className="text-xs text-amber-700 font-medium mt-1 mb-2">
                    💡 <strong>Note:</strong> Supabase has a standard rate limit of 3 sign-in emails per hour per address. 
                  </p>
                )}
                <button
                  type="button"
                  onClick={handleDemoBypass}
                  className="w-full mt-1 py-1.5 px-2 bg-amber-100 hover:bg-amber-200 text-[#16305C] border border-amber-300 rounded text-xs font-bold transition-colors flex items-center justify-center gap-1"
                >
                  ⚡ Force Bypass & Log In with Mock DB Instantly
                </button>
              </div>
            )}
          </form>

          <div className="mt-6 pt-6 border-t border-slate-100 flex flex-col items-center">
            <span className="text-xs text-slate-400 mb-3">Don't want to wait for email OTP?</span>
            <button
              type="button"
              onClick={handleDemoBypass}
              className="w-full py-2.5 px-4 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 font-bold rounded-lg text-xs transition-colors flex items-center justify-center gap-2 shadow-sm"
            >
              <span>⚡</span> One-Click Demo Login (Bypass Email Limit)
            </button>
          </div>
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
              <h1 className="text-xl font-black font-serif text-[#16305C]">FindMe</h1>
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
                className="w-full py-1 bg-[#16305C] text-white font-bold rounded text-[10px] uppercase tracking-wider hover:bg-[#3E5B85] transition-colors"
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
                  className={`w-full text-left p-4 border-b border-slate-100 flex items-center gap-3 transition-colors ${activeTagId === t.tag_id ? 'bg-[#F5EAF1] border-l-4 border-l-[#E23F84]' : 'hover:bg-slate-50 border-l-4 border-l-transparent'}`}
                >
                  <span className="text-2xl">{t.avatar || '🧒'}</span>
                  <div>
                    <div className="font-semibold text-sm text-[#16305C]">{t.child_name || 'Unnamed Tag'}</div>
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
              className="w-full p-2 text-sm border border-slate-300 rounded-lg mb-3 font-mono focus:outline-none focus:ring-2 focus:ring-[#16305C]"
            />
            <button 
              onClick={handleClaimTag} 
              disabled={!tagToClaim || saving} 
              className="w-full bg-[#2A5FD9] text-white p-2.5 rounded-lg text-sm font-semibold hover:bg-[#1E4CB8] transition-colors disabled:opacity-50"
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
                <h3 className="text-sm font-bold text-[#16305C] mb-3 uppercase tracking-wider">How the "self-service upload" actually works</h3>
                <p className="text-sm leading-relaxed mb-4">
                  The physical NFC chip only ever stores one thing: a URL, like <span className="font-mono bg-slate-200 text-[#E23F84] px-1 py-0.5 rounded text-xs">findme.co.za/t/8f3k2p</span>. That's written once, before the tag ships.
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
                  <h2 className="text-2xl font-bold text-[#16305C] flex items-center gap-3">
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
                    className="px-6 py-2 bg-[#16305C] text-white rounded-lg font-semibold text-sm hover:bg-[#3E5B85] transition-colors"
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
                      className="w-full p-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16305C]" 
                    />
                  </div>
                  <div className="sm:col-span-1">
                    <label className="block text-xs font-bold uppercase text-slate-500 mb-2">Avatar</label>
                    <select 
                      value={formData.avatar || '🧒'} 
                      onChange={e => setFormData({...formData, avatar: e.target.value})} 
                      className="w-full p-3 border border-slate-200 rounded-lg text-xl text-center focus:outline-none focus:ring-2 focus:ring-[#16305C]"
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
                    className="w-full p-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16305C]" 
                  />
                  <p className="text-xs text-slate-500 mt-2">When a finder taps "Share location", a map link will be sent here.</p>
                </div>

                <hr className="border-slate-100"/>
                
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <label className="block text-xs font-bold uppercase text-slate-500">Emergency Contacts</label>
                    <button 
                      onClick={() => setFormData({...formData, contacts: [...(formData.contacts||[]), {name:'', relation:'', phone:'', whatsapp:true}]})} 
                      className="text-[#2A5FD9] text-sm font-semibold hover:underline"
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
                          <input type="text" placeholder="e.g. Thandeka" value={c.name} onChange={e => { const nc = [...formData.contacts]; nc[i].name = e.target.value; setFormData({...formData, contacts: nc}); }} className="w-full p-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#16305C]" />
                        </div>
                        <div>
                          <label className="block text-[10px] uppercase text-slate-500 mb-1">Relation</label>
                          <input type="text" placeholder="e.g. Mom" value={c.relation} onChange={e => { const nc = [...formData.contacts]; nc[i].relation = e.target.value; setFormData({...formData, contacts: nc}); }} className="w-full p-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#16305C]" />
                        </div>
                      </div>
                      
                      <div className="mb-3">
                        <label className="block text-[10px] uppercase text-slate-500 mb-1">Phone Number</label>
                        <input type="tel" placeholder="e.g. 082 123 4567" value={c.phone} onChange={e => { const nc = [...formData.contacts]; nc[i].phone = e.target.value; setFormData({...formData, contacts: nc}); }} className="w-full p-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#16305C]" />
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
                      <input type="text" placeholder="e.g. Peanuts, Penicillin" value={formData.medical?.allergies || ''} onChange={e => setFormData({...formData, medical: {...formData.medical, allergies: e.target.value}})} className="w-full p-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#16305C]" />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase text-slate-500 mb-1">Conditions</label>
                      <input type="text" placeholder="e.g. Asthma, Epilepsy" value={formData.medical?.conditions || ''} onChange={e => setFormData({...formData, medical: {...formData.medical, conditions: e.target.value}})} className="w-full p-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#16305C]" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase text-slate-500 mb-1">Additional Notes</label>
                    <textarea placeholder="e.g. Carries an inhaler in the front pocket of her school bag." value={formData.medical?.notes || ''} onChange={e => setFormData({...formData, medical: {...formData.medical, notes: e.target.value}})} className="w-full p-3 border border-slate-200 rounded-lg h-24 resize-none text-sm focus:outline-none focus:ring-2 focus:ring-[#16305C]"></textarea>
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
