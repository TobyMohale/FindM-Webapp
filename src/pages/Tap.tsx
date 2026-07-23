import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase, cleanPhone } from '../lib/supabase';
import { DICTIONARY, LANGS, LangCode } from '../lib/dictionary';

const triggerHaptic = () => {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try {
      navigator.vibrate(30);
    } catch (e) {
      // Ignored
    }
  }
};

const getBrowserLanguage = (): LangCode => {
  if (typeof navigator !== 'undefined') {
    const userLangs = navigator.languages || [navigator.language];
    for (const userLang of userLangs) {
      const code = userLang.split('-')[0].toLowerCase();
      if (code === 'en' || code === 'af' || code === 'zu' || code === 'nso') {
        return code as LangCode;
      }
    }
  }
  return 'en';
};

export default function TapView() {
  const { tagId } = useParams<{ tagId: string }>();
  const navigate = useNavigate();
  const [lang, setLang] = useState<LangCode>(getBrowserLanguage());
  const [record, setRecord] = useState<any>(null);
  const [parentProfile, setParentProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [shareStatus, setShareStatus] = useState('');
  const [finderAlertStatus, setFinderAlertStatus] = useState('');
  const [currentUser, setCurrentUser] = useState<any>(null);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isDemoFallback, setIsDemoFallback] = useState(false);
  const [showLocationFallback, setShowLocationFallback] = useState(false);
  const [customNote, setCustomNote] = useState('');
  const [finderName, setFinderName] = useState('');
  const [finderPhone, setFinderPhone] = useState('');

  useEffect(() => {
    const fetchTag = async () => {
      if (!tagId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setErrorMsg(null);
      setIsDemoFallback(false);
      
      const demoData = {
        tag_id: 'demo01',
        owner_id: 'mock-user-1',
        child_name: 'Amo Dlamini',
        avatar: '🦸‍♀️',
        parent_whatsapp: '',
        contacts: [{ name: 'Thandeka Dlamini', relation: 'Mom', phone: '', whatsapp: true }],
        medical: { allergies: 'Peanuts', conditions: 'Asthma', notes: '' },
        created_at: new Date().toISOString(),
        claimed_at: new Date().toISOString()
      };

      try {
        // Safe check for supabase client
        if (!supabase || typeof supabase.from !== 'function') {
          throw new Error('Database client not fully initialized.');
        }

        // Add 3-second timeout so the UI never hangs in sandbox or on poor connections
        const fetchPromise = supabase.from('tags').select('*').eq('tag_id', tagId);
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Database query timeout (3s limit).')), 3000)
        );

        const { data, error } = await Promise.race([fetchPromise, timeoutPromise]) as any;
        
        if (error) {
          console.error("Supabase fetch error:", error);
          
          if (error?.code === 'PGRST205' || error?.message?.includes('schema')) {
            setErrorMsg("Database tables are missing. Please run the schema.sql file in your Supabase SQL Editor to initialize the project.");
            setRecord(null);
            return;
          } else {
            setErrorMsg(error.message);
          }
          
          if (tagId === 'demo01') {
            setRecord(demoData);
            setIsDemoFallback(true);
            setParentProfile({
              full_name: 'Thandeka Dlamini',
              email: 'parent@example.com'
            });
          } else {
            setRecord(null);
          }
        } else if (data && data.length > 0) {
          const tag = data[0];
          if (!tag.owner_id) {
            // Unclaimed tag
            if (tagId === 'demo01') {
              setRecord(demoData);
              setIsDemoFallback(true);
              setParentProfile({
                full_name: 'Thandeka Dlamini',
                email: 'parent@example.com'
              });
            } else {
              navigate(`/claim/${tagId}`, { replace: true });
            }
          } else {
            // Increment scan count and update last scanned timestamp via secure RPC
            const newScanCount = (tag.scan_count || 0) + 1;
            const now = new Date().toISOString();
            
            supabase.rpc('increment_tag_scan', { target_tag_id: tag.tag_id }).then(({ error }) => {
              if (error) console.error("Error incrementing scan count:", error);
            });

            setRecord({
              ...tag,
              scan_count: newScanCount,
              last_scanned_at: now
            });

            // Trigger Resend notification in the background
            fetch('/api/notify/scan', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                tag_id: tag.tag_id,
                child_name: tag.child_name,
                scan_count: newScanCount,
                timestamp: now
              })
            }).then(res => res.json())
              .then(resData => console.log('Resend scan alert response:', resData))
              .catch(err => console.error('Resend scan alert error:', err));
          }
        } else {
          // No tag found in database
          if (tagId === 'demo01') {
            setRecord(demoData);
            setIsDemoFallback(true);
            setParentProfile({
              full_name: 'Thandeka Dlamini',
              email: 'parent@example.com'
            });
          } else {
            setRecord(null);
          }
        }
      } catch (err: any) {
        console.error("Catch error in fetchTag:", err);
        setErrorMsg(err.message || 'Database connection error');
        if (tagId === 'demo01') {
          setRecord(demoData);
          setIsDemoFallback(true);
          setParentProfile({
            full_name: 'Thandeka Dlamini',
            email: 'parent@example.com'
          });
        } else {
          setRecord(null);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchTag();
  }, [tagId, navigate]);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setCurrentUser(user);
      } catch (e) {
        console.warn("Error getting current user:", e);
      }
    };
    fetchUser();
  }, []);

  const getTargetWhatsapp = () => {
    if (record?.parent_whatsapp) return record.parent_whatsapp;
    if (record?.contacts && record.contacts.length > 0) {
      const waContact = record.contacts.find((c: any) => c.whatsapp && c.phone);
      if (waContact) return waContact.phone;
      const anyContact = record.contacts.find((c: any) => c.phone);
      if (anyContact) return anyContact.phone;
    }
    return null;
  };

  const handleShareLocation = () => {
    const targetWa = getTargetWhatsapp();
    if (!targetWa) {
      setShareStatus(DICTIONARY[lang].noParentPhone);
      return;
    }
    setShareStatus(DICTIONARY[lang].locationSharing);
    setShowLocationFallback(false);
    
    if (!navigator.geolocation) {
      setShareStatus('GPS permission blocked/unavailable. Showing backup simulation tools...');
      setShowLocationFallback(true);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const mapsLink = `https://maps.google.com/?q=${latitude},${longitude}`;
        const msg = `${record.child_name || 'Your child'}'s safety tag was just tapped. Location: ${mapsLink} (sent ${new Date().toLocaleTimeString()})`;
        const waLink = `https://wa.me/${cleanPhone(targetWa).replace('+', '')}?text=${encodeURIComponent(msg)}`;
        setShareStatus(DICTIONARY[lang].locationShared);
        window.open(waLink, '_blank');

        fetch('/api/notify/location', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tag_id: record.tag_id,
            child_name: record.child_name,
            latitude,
            longitude,
            place_name: 'Live GPS Coordinates',
            timestamp: new Date().toISOString()
          })
        }).then(res => res.json())
          .then(resData => console.log('Resend location alert response:', resData))
          .catch(err => console.error('Resend location alert error:', err));
      },
      (err) => {
        console.warn("Geolocation failed:", err);
        setShareStatus('GPS permission blocked/unavailable. Showing backup simulation tools...');
        setShowLocationFallback(true);
      },
      { timeout: 5000 }
    );
  };

  const handleSimulatedLocation = (lat: number, lng: number, placeName: string) => {
    const targetWa = getTargetWhatsapp();
    if (!targetWa) return;
    const mapsLink = `https://maps.google.com/?q=${lat},${lng}`;
    const msg = `[Demo GPS Alert] ${record.child_name || 'Your child'}'s safety tag was just tapped. Location: ${placeName} (${mapsLink}) — sent ${new Date().toLocaleTimeString()}`;
    const waLink = `https://wa.me/${cleanPhone(targetWa).replace('+', '')}?text=${encodeURIComponent(msg)}`;
    setShareStatus(`Opening WhatsApp with simulated location...`);
    window.open(waLink, '_blank');

    fetch('/api/notify/location', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tag_id: record.tag_id,
        child_name: record.child_name,
        latitude: lat,
        longitude: lng,
        place_name: placeName,
        timestamp: new Date().toISOString()
      })
    }).then(res => res.json())
      .then(resData => {
        console.log('Resend location alert response:', resData);
        setShareStatus(`WhatsApp opened & automatic location alert email sent via Resend!`);
      })
      .catch(err => console.error('Resend location alert error:', err));
  };

  const handleFinderAlertSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const targetWa = getTargetWhatsapp();
    if (!targetWa) {
      setFinderAlertStatus(DICTIONARY[lang].noParentPhone);
      return;
    }
    
    let msg = `🚨 *[EMERGENCY FINDER ALERT]* 🚨\n`;
    msg += `I have found your child: *${record.child_name || 'Unnamed'}*\n\n`;
    
    if (finderName.trim()) {
      msg += `👤 *Finder Name:* ${finderName.trim()}\n`;
    }
    if (finderPhone.trim()) {
      msg += `📞 *Finder Contact:* ${finderPhone.trim()}\n`;
    }
    if (customNote.trim()) {
      msg += `📍 *Note/Location:* ${customNote.trim()}\n`;
    }
    
    msg += `\n_Sent via LoTap tags at ${new Date().toLocaleTimeString()}_`;
    
    const waLink = `https://wa.me/${cleanPhone(targetWa).replace('+', '')}?text=${encodeURIComponent(msg)}`;
    setFinderAlertStatus(`Opening WhatsApp to alert parent...`);
    window.open(waLink, '_blank');

    fetch('/api/notify/finder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tag_id: record.tag_id,
        child_name: record.child_name,
        finder_name: finderName.trim(),
        finder_phone: finderPhone.trim(),
        custom_note: customNote.trim(),
        timestamp: new Date().toISOString()
      })
    }).then(res => res.json())
      .then(resData => {
        console.log('Resend finder alert response:', resData);
        if (resData.success && resData.sent) {
          setFinderAlertStatus(prev => prev + " & sent an automatic email notification!");
        }
      })
      .catch(err => console.error('Resend finder alert error:', err));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] pb-12 sm:pt-8 sm:px-4 flex justify-center font-sans relative overflow-hidden">
        {/* Morphing Liquid Background Blobs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
          <div className="absolute top-[15%] left-[-20%] w-[350px] h-[350px] bg-[#FFCFF1] opacity-[0.5] blur-[80px] animate-morph-blob-1 rounded-full"></div>
          <div className="absolute bottom-[20%] right-[-20%] w-[350px] h-[350px] bg-[#C54B8C] opacity-[0.16] blur-[90px] animate-morph-blob-2 rounded-full"></div>
        </div>

        <div className="w-full max-w-[400px] glass-liquid-card sm:rounded-[38px] sm:shadow-2xl overflow-hidden flex flex-col relative min-h-[100dvh] sm:min-h-[750px] z-10">
          
          {/* Hardware Mockup Notch (Desktop preview) */}
          <div className="hidden sm:block absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-slate-100 rounded-b-2xl z-10"></div>
          
          {/* Hero Section Skeleton */}
          <div className="bg-gradient-to-br from-[#051650] to-[#0A2472] text-white p-8 text-center pt-12 relative flex-shrink-0">
            <div className="absolute top-4 left-4 font-mono text-[9px] opacity-40 bg-white/10 px-2 py-0.5 rounded uppercase tracking-wider animate-pulse">
              Retrieving profile...
            </div>
            
            {/* Pulsing Avatar Halo */}
            <div className="relative w-20 h-20 mx-auto mb-4 flex items-center justify-center">
              <div className="absolute inset-0 bg-[#C54B8C]/20 rounded-full animate-ping"></div>
              <div className="absolute inset-2 bg-white/15 rounded-full border border-white/20 flex items-center justify-center text-2xl animate-pulse">
                🏷️
              </div>
            </div>

            {/* Shimmering Text Placeholders */}
            <div className="h-5 w-28 bg-white/25 rounded-full mx-auto mb-2.5 animate-pulse" />
            <div className="h-3 w-40 bg-white/15 rounded-full mx-auto animate-pulse" />
          </div>

          {/* Body Skeleton */}
          <div className="flex-1 p-6 space-y-6">
            {/* Language Bar Skeleton */}
            <div className="flex justify-center gap-1.5 p-1 bg-slate-100 rounded-xl">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-8 flex-1 bg-slate-200/60 rounded-lg animate-pulse" />
              ))}
            </div>

            {/* Emergency Contacts Title Skeleton */}
            <div className="space-y-3">
              <div className="h-4 w-32 bg-slate-200 rounded animate-pulse" />
              <div className="space-y-2.5">
                {[1, 2].map((i) => (
                  <div key={i} className="h-16 w-full bg-slate-50 border border-slate-100 rounded-2xl p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-slate-200/80 rounded-full animate-pulse" />
                      <div className="space-y-1.5">
                        <div className="h-3 w-20 bg-slate-200 rounded animate-pulse" />
                        <div className="h-2.5 w-12 bg-slate-200/60 rounded animate-pulse" />
                      </div>
                    </div>
                    <div className="flex gap-1.5">
                      <div className="w-8 h-8 bg-slate-200/50 rounded-lg animate-pulse" />
                      <div className="w-8 h-8 bg-slate-200/50 rounded-lg animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Medical Info Skeleton */}
            <div className="p-4 bg-red-50/40 border border-red-100/50 rounded-2xl space-y-3">
              <div className="h-3.5 w-24 bg-red-200/60 rounded animate-pulse" />
              <div className="space-y-1.5">
                <div className="h-2.5 w-full bg-red-200/40 rounded animate-pulse" />
                <div className="h-2.5 w-5/6 bg-red-200/40 rounded animate-pulse" />
              </div>
            </div>

            {/* Action Button Skeleton */}
            <div className="pt-2">
              <div className="h-14 w-full bg-slate-200 rounded-2xl animate-pulse" />
              <div className="h-2.5 w-32 bg-slate-200/80 rounded mx-auto mt-3 animate-pulse" />
            </div>
          </div>

        </div>
      </div>
    );
  }
  
  if (!record) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center p-6 font-sans relative overflow-hidden">
        {/* Morphing Liquid Background Blobs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
          <div className="absolute top-[15%] left-[-20%] w-[350px] h-[350px] bg-[#FFCFF1] opacity-[0.5] blur-[80px] animate-morph-blob-1 rounded-full"></div>
          <div className="absolute bottom-[20%] right-[-20%] w-[350px] h-[350px] bg-[#C54B8C] opacity-[0.16] blur-[90px] animate-morph-blob-2 rounded-full"></div>
        </div>

        <div className="glass-liquid-card p-8 rounded-3xl shadow-2xl text-center max-w-md w-full z-10">
          <div className="text-5xl mb-4">🏷️</div>
          <h2 className="text-xl font-bold text-[#051650] mb-2 font-serif">Tag Not Found or Inactive</h2>
          <p className="text-sm text-slate-500 mb-6 leading-relaxed">
            We couldn't find a registered safety tag with ID <span className="font-mono bg-slate-100 text-[#C54B8C] px-1.5 py-0.5 rounded text-xs font-semibold">{tagId}</span> in the database.
          </p>

          {errorMsg && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-left">
              <p className="text-xs font-bold text-red-800 mb-1">Database Connection Status:</p>
              <p className="text-xs text-red-600 font-mono leading-relaxed break-words">{errorMsg}</p>
              {errorMsg.toLowerCase().includes('relation') && errorMsg.toLowerCase().includes('does not exist') && (
                <p className="text-xs text-amber-800 mt-2 font-medium">
                  💡 <strong>Tip:</strong> The <code>tags</code> table is missing from your Supabase instance. Please copy the SQL from <code>schema.sql</code> and execute it in your Supabase SQL Editor.
                </p>
              )}
            </div>
          )}

          <div className="flex flex-col gap-2.5">
            {/* Quick action to auto-create and claim this tag if they want to test */}
            <button
              onClick={async () => {
                setLoading(true);
                try {
                  // Attempt to insert/claim this tag in mock storage or database if allowed
                  const { error } = await supabase.from('tags').insert({
                    tag_id: tagId,
                    owner_id: null, // unclaimed
                    child_name: 'New Child Profile',
                    avatar: '🧒',
                    contacts: [],
                    medical: { allergies: '', conditions: '', notes: '' }
                  });
                  if (!error) {
                    // Navigate to claim view
                    navigate(`/claim/${tagId}`);
                  } else {
                    alert('Could not auto-create tag: ' + error.message);
                  }
                } catch (e: any) {
                  alert('Error auto-creating tag: ' + e.message);
                } finally {
                  setLoading(false);
                }
              }}
              className="w-full py-3 px-4 bg-[#051650] hover:bg-[#0A2472] text-white font-bold rounded-xl text-xs transition-all shadow-sm flex items-center justify-center gap-2"
            >
              <span>✨</span> Create & Register Tag "{tagId}" Instantly
            </button>

            <button
              onClick={() => {
                localStorage.setItem('findme_force_mock', 'true');
                window.location.reload();
              }}
              className="w-full py-3 px-4 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2"
            >
              <span>⚡</span> Switch to Demo Mock Mode (Bypass Supabase)
            </button>

            <div className="grid grid-cols-2 gap-2 mt-2">
              <button
                onClick={() => navigate('/')}
                className="py-2.5 px-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold rounded-lg text-xs transition-all"
              >
                🏠 Back to Home
              </button>
              <button
                onClick={() => navigate('/dashboard')}
                className="py-2.5 px-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-[#051650] font-bold rounded-lg text-xs transition-all"
              >
                ⚙️ Parent Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const t = DICTIONARY[lang];
  const hasMedical = record.medical?.allergies || record.medical?.conditions || record.medical?.notes;

  return (
    <div className="min-h-screen bg-[#FDFBF7] pb-12 sm:pt-8 sm:px-4 flex justify-center font-sans relative overflow-hidden">
      {/* Morphing Liquid Background Blobs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[15%] left-[-20%] w-[350px] h-[350px] bg-[#FFCFF1] opacity-[0.5] blur-[80px] animate-morph-blob-1 rounded-full"></div>
        <div className="absolute bottom-[20%] right-[-20%] w-[350px] h-[350px] bg-[#C54B8C] opacity-[0.16] blur-[90px] animate-morph-blob-2 rounded-full"></div>
      </div>

      <div className="w-full max-w-[400px] glass-liquid-card sm:rounded-[38px] sm:shadow-2xl overflow-hidden flex flex-col relative min-h-[100dvh] sm:min-h-[750px] z-10">
        
        {currentUser && (
          <button 
            onClick={() => { triggerHaptic(); navigate('/dashboard'); }}
            className="bg-[#051650] text-[#FFCFF1] hover:bg-[#0A2472] text-[11px] uppercase tracking-wider font-extrabold text-center py-2.5 px-4 flex items-center justify-center gap-1.5 relative z-20 w-full transition-colors border-b border-[#C54B8C]/20"
          >
            <span>⬅️</span> Back to Parent Dashboard
          </button>
        )}

        {isDemoFallback && (
          <div className="bg-amber-500 text-white text-[10px] uppercase tracking-wider font-bold text-center py-1.5 px-4 flex items-center justify-center gap-1.5 relative z-20">
            <span>⚡</span> Running on Local Demo Fallback (No Supabase Tag Found)
          </div>
        )}

        {/* Hardware Mockup Notch (Desktop preview) */}
        <div className="hidden sm:block absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-slate-100 rounded-b-2xl z-10"></div>
        
        {/* Hero Section */}
        <div className="bg-gradient-to-br from-[#051650] to-[#0A2472] text-white p-8 text-center pt-12 relative">
          <div className="absolute top-4 left-4 font-mono text-xs opacity-50">{record.tag_id}</div>
          <div className="relative w-20 h-20 mx-auto mb-4">
            <div className="absolute inset-0 bg-[#C54B8C] rounded-full animate-ping opacity-20"></div>
            <div className="absolute inset-0 bg-white/10 rounded-full flex items-center justify-center text-4xl border-2 border-[#C54B8C]">
              {record.avatar || '🧒'}
            </div>
          </div>
          <h1 className="text-2xl font-bold font-serif mb-2">{record.child_name || 'Child'}</h1>
          <p className="text-sm opacity-90 leading-snug max-w-[250px] mx-auto">{t.tagline}</p>
        </div>

        {/* Language Switcher */}
        <div className="px-4 pt-3 pb-2.5 bg-[#FFCFF1] border-b border-[#DCE6F5] flex-shrink-0">
          <label className="block text-[10px] font-black uppercase text-[#051650] mb-1.5 opacity-80 tracking-wider">
            🌐 {t.selectLanguage} (Auto-detected)
          </label>
          <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-0.5">
            {LANGS.map(l => (
              <button 
                key={l.code}
                type="button"
                onClick={() => { triggerHaptic(); setLang(l.code as LangCode); }}
                className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all active:scale-95 ${lang === l.code ? 'bg-[#051650] text-white shadow-md scale-105' : 'bg-white text-[#0A2472] border border-[#DCE6F5] hover:bg-slate-50'}`}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>

        {/* Info Body */}
        <div className="p-5 flex-1 flex flex-col gap-6">
          {record.emergency_mode && (
            <div className="bg-rose-50 border-2 border-rose-500 rounded-2xl p-4 shadow-lg text-center animate-subtle-pulse relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-rose-500 animate-pulse"></div>
              <h3 className="text-xs font-black text-rose-700 uppercase tracking-widest mb-1.5 flex items-center justify-center gap-1">
                <span className="w-2 h-2 rounded-full bg-rose-600 inline-block mr-1 animate-ping"></span>
                🚨 Emergency Broadcast Active
              </h3>
              <p className="text-slate-600 text-xs mb-3 font-medium">
                The parent has flagged this band as currently lost or in distress. Please tap below to call them immediately.
              </p>
              {record.contacts && record.contacts.length > 0 ? (
                (() => {
                  const firstContact = record.contacts.find((c: any) => c.phone) || record.contacts[0];
                  if (firstContact.phone) {
                    return (
                      <a
                        href={`tel:${cleanPhone(firstContact.phone)}`}
                        onClick={triggerHaptic}
                        className="w-full bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-sm py-3 px-4 rounded-xl shadow-md flex items-center justify-center gap-2 transition-transform transform active:scale-95 animate-pulse"
                      >
                        📞 CALL EMERGENCY CONTACT ({firstContact.name})
                      </a>
                    );
                  }
                  return (
                    <div className="text-xs text-rose-600 font-bold">
                      No emergency phone numbers set on contacts list.
                    </div>
                  );
                })()
              ) : (
                <div className="text-xs text-rose-600 font-bold">
                  No emergency contacts configured yet.
                </div>
              )}
            </div>
          )}
          {/* Parent/Guardian Info */}
          {parentProfile && (
            <div className="bg-white border border-[#DCE6F5] rounded-xl p-4 shadow-sm text-sm text-[#051650] space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#C54B8C] flex items-center gap-1.5">
                <span>🛡️</span> Registered Parent / Guardian
              </h2>
              <div className="space-y-2 text-xs">
                {parentProfile.full_name && (
                  <p className="text-slate-700 flex justify-between items-center border-b border-slate-50 pb-1.5">
                    <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">Name</span>
                    <span className="font-semibold text-slate-800">{parentProfile.full_name}</span>
                  </p>
                )}
                <p className="text-slate-700 flex justify-between items-center border-b border-slate-50 pb-1.5">
                  <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">Email</span>
                  <a href={`mailto:${parentProfile.email}`} className="text-[#051650] hover:underline font-bold font-mono">{parentProfile.email}</a>
                </p>
                {record.parent_whatsapp && (
                  <p className="text-slate-700 flex justify-between items-center pb-0.5">
                    <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">WhatsApp/Phone</span>
                    <a href={`tel:${cleanPhone(record.parent_whatsapp)}`} className="text-[#051650] hover:underline font-bold font-mono">{record.parent_whatsapp}</a>
                  </p>
                )}
              </div>
            </div>
          )}

          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#0A2472] mb-3">{t.emergencyContacts}</h2>
            {record.contacts && record.contacts.length > 0 ? (
              record.contacts.map((c: any, i: number) => (
                <div key={i} className="flex items-center justify-between bg-white border border-[#DCE6F5] rounded-xl p-3 mb-2 shadow-sm">
                  <div>
                    <div className="font-semibold text-sm text-[#051650]">{c.name}</div>
                    <div className="text-xs text-[#0A2472]">{c.relation}</div>
                  </div>
                  <div className="flex gap-2">
                    {c.phone && (
                      <a href={`tel:${cleanPhone(c.phone)}`} onClick={triggerHaptic} className="w-9 h-9 rounded-full bg-[#051650] text-white flex items-center justify-center text-sm shadow-sm hover:bg-[#0A2472] transition-colors" title={t.call}>📞</a>
                    )}
                    {c.whatsapp && c.phone && (
                      <a href={`https://wa.me/${cleanPhone(c.phone).replace('+', '')}`} onClick={triggerHaptic} target="_blank" rel="noreferrer" className="w-9 h-9 rounded-full bg-[#25D366] text-white flex items-center justify-center text-sm shadow-sm hover:bg-[#20bd5a] transition-colors" title={t.whatsapp}>💬</a>
                    )}
                  </div>
                </div>
              ))
            ) : <p className="text-sm text-slate-500 italic">{t.noInfo}</p>}
          </div>

          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#0A2472] mb-3">{t.medicalInfo}</h2>
            {hasMedical ? (
              <div className="bg-white border border-[#DCE6F5] rounded-xl p-4 shadow-sm text-sm text-[#051650] space-y-2">
                {record.medical.allergies && <div><span className="font-bold">{t.allergies}:</span> {record.medical.allergies}</div>}
                {record.medical.conditions && <div><span className="font-bold">{t.conditions}:</span> {record.medical.conditions}</div>}
                {record.medical.notes && <div className="pt-2 mt-2 border-t border-slate-100 leading-relaxed"><span className="font-bold">{t.notes}:</span> <br/>{record.medical.notes}</div>}
              </div>
            ) : <p className="text-sm text-slate-500 italic">{t.noInfo}</p>}
          </div>

          {/* Finder Contact Details Form */}
          <div className="bg-[#FFCFF1] border border-[#D470A2]/35 rounded-2xl p-4 shadow-sm">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-[#051650] mb-1 flex items-center gap-1.5">
              <span>{t.finderHeader}</span>
            </h2>
            <p className="text-[11px] text-slate-600 mb-4 leading-relaxed">
              {t.finderSub}
            </p>

            <form onSubmit={handleFinderAlertSubmit} className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">{t.finderName}</label>
                <input
                  type="text"
                  placeholder="e.g. Officer Temba"
                  value={finderName}
                  onChange={e => setFinderName(e.target.value)}
                  className="w-full p-2.5 text-xs border border-[#DCE6F5] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#C54B8C] bg-white text-[#051650]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">{t.finderPhone}</label>
                  <input
                    type="tel"
                    placeholder="e.g. 082 123 4567"
                    value={finderPhone}
                    onChange={e => setFinderPhone(e.target.value)}
                    className="w-full p-2.5 text-xs border border-[#DCE6F5] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#C54B8C] bg-white text-[#051650]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">{t.finderNote}</label>
                  <input
                    type="text"
                    placeholder="e.g. At information desk"
                    value={customNote}
                    onChange={e => setCustomNote(e.target.value)}
                    className="w-full p-2.5 text-xs border border-[#DCE6F5] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#C54B8C] bg-white text-[#051650]"
                  />
                </div>
              </div>

              <button
                type="submit"
                onClick={triggerHaptic}
                disabled={!finderName.trim() && !finderPhone.trim() && !customNote.trim()}
                className="w-full mt-2 bg-[#051650] hover:bg-[#0A2472] text-white py-3 px-4 rounded-xl text-xs font-bold transition-all shadow-sm disabled:opacity-40"
              >
                {t.finderBtn}
              </button>
              {finderAlertStatus && <p className="text-center text-xs text-[#C54B8C] mt-2 font-medium">{finderAlertStatus}</p>}
            </form>
          </div>

          <div className="mt-auto pt-4">
            <button 
              onClick={() => { triggerHaptic(); handleShareLocation(); }}
              className="w-full bg-[#C54B8C] text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 shadow-md hover:bg-[#B53389] active:scale-[0.98] transition-all"
            >
              📍 {t.shareLocation}
            </button>
            <p className="text-center text-xs text-[#0A2472] mt-3 min-h-4 font-medium leading-relaxed">{shareStatus}</p>

            {showLocationFallback && (
              <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-2xl text-left text-[#051650] animate-fadeIn">
                <p className="text-xs font-extrabold uppercase text-amber-800 mb-1 flex items-center gap-1">
                  <span>💡</span> Sandbox Geolocation Helper
                </p>
                <p className="text-[11px] text-slate-600 mb-3 leading-relaxed">
                  Web browser policies block live GPS inside sandboxed developer previews. Use these 100% functional simulator options instead:
                </p>
                
                <div className="space-y-2">
                  <button
                    onClick={() => { triggerHaptic(); handleSimulatedLocation(-26.1062, 28.0536, 'Sandton, Johannesburg'); }}
                    className="w-full py-2.5 px-3 bg-white hover:bg-slate-50 border border-slate-200 text-xs font-bold rounded-lg transition-colors flex items-center justify-between text-[#051650] shadow-sm"
                  >
                    <span>🏙️ Send Sandton, JHB GPS link</span>
                    <span className="text-slate-400">→</span>
                  </button>
                  <button
                    onClick={() => { triggerHaptic(); handleSimulatedLocation(-33.9249, 18.4241, 'Waterfront, Cape Town'); }}
                    className="w-full py-2.5 px-3 bg-white hover:bg-slate-50 border border-slate-200 text-xs font-bold rounded-lg transition-colors flex items-center justify-between text-[#051650] shadow-sm"
                  >
                    <span>🏖️ Send Cape Town GPS link</span>
                    <span className="text-slate-400">→</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
