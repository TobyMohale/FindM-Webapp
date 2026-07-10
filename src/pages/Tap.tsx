import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase, cleanPhone } from '../lib/supabase';
import { DICTIONARY, LANGS, LangCode } from '../lib/dictionary';

export default function TapView() {
  const { tagId } = useParams<{ tagId: string }>();
  const navigate = useNavigate();
  const [lang, setLang] = useState<LangCode>('en');
  const [record, setRecord] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [shareStatus, setShareStatus] = useState('');

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
        parent_whatsapp: '+27821234567',
        contacts: [{ name: 'Thandeka Dlamini', relation: 'Mom', phone: '+27821234567', whatsapp: true }],
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
          setErrorMsg(error.message);
          
          if (tagId === 'demo01') {
            setRecord(demoData);
            setIsDemoFallback(true);
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
            } else {
              navigate(`/claim/${tagId}`, { replace: true });
            }
          } else {
            setRecord(tag);
          }
        } else {
          // No tag found in database
          if (tagId === 'demo01') {
            setRecord(demoData);
            setIsDemoFallback(true);
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
        } else {
          setRecord(null);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchTag();
  }, [tagId, navigate]);

  const handleShareLocation = () => {
    if (!record?.parent_whatsapp) {
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
        const waLink = `https://wa.me/${cleanPhone(record.parent_whatsapp).replace('+', '')}?text=${encodeURIComponent(msg)}`;
        setShareStatus(DICTIONARY[lang].locationShared);
        window.open(waLink, '_blank');
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
    if (!record?.parent_whatsapp) return;
    const mapsLink = `https://maps.google.com/?q=${lat},${lng}`;
    const msg = `[Demo GPS Alert] ${record.child_name || 'Your child'}'s safety tag was just tapped. Location: ${placeName} (${mapsLink}) — sent ${new Date().toLocaleTimeString()}`;
    const waLink = `https://wa.me/${cleanPhone(record.parent_whatsapp).replace('+', '')}?text=${encodeURIComponent(msg)}`;
    setShareStatus(`Opening WhatsApp with simulated location...`);
    window.open(waLink, '_blank');
  };

  const handleFinderAlertSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!record?.parent_whatsapp) return;
    
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
    
    msg += `\n_Sent via FindMe tags at ${new Date().toLocaleTimeString()}_`;
    
    const waLink = `https://wa.me/${cleanPhone(record.parent_whatsapp).replace('+', '')}?text=${encodeURIComponent(msg)}`;
    setShareStatus(`Opening WhatsApp to alert parent...`);
    window.open(waLink, '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 pb-12 sm:pt-8 sm:px-4 flex justify-center font-sans">
        <div className="w-full max-w-[400px] bg-white sm:rounded-[38px] sm:shadow-2xl overflow-hidden flex flex-col relative min-h-[100dvh] sm:min-h-[750px] border border-slate-200">
          
          {/* Hardware Mockup Notch (Desktop preview) */}
          <div className="hidden sm:block absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-slate-100 rounded-b-2xl z-10"></div>
          
          {/* Hero Section Skeleton */}
          <div className="bg-gradient-to-br from-[#16305C] to-[#3E5B85] text-white p-8 text-center pt-12 relative flex-shrink-0">
            <div className="absolute top-4 left-4 font-mono text-[9px] opacity-40 bg-white/10 px-2 py-0.5 rounded uppercase tracking-wider animate-pulse">
              Retrieving profile...
            </div>
            
            {/* Pulsing Avatar Halo */}
            <div className="relative w-20 h-20 mx-auto mb-4 flex items-center justify-center">
              <div className="absolute inset-0 bg-[#E23F84]/20 rounded-full animate-ping"></div>
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
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6 font-sans">
        <div className="bg-white p-8 rounded-2xl shadow-md border border-slate-200 text-center max-w-md w-full">
          <div className="text-5xl mb-4">🏷️</div>
          <h2 className="text-xl font-bold text-[#16305C] mb-2 font-serif">Tag Not Found or Inactive</h2>
          <p className="text-sm text-slate-500 mb-6 leading-relaxed">
            We couldn't find a registered safety tag with ID <span className="font-mono bg-slate-100 text-[#E23F84] px-1.5 py-0.5 rounded text-xs font-semibold">{tagId}</span> in the database.
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
              className="w-full py-3 px-4 bg-[#16305C] hover:bg-[#3E5B85] text-white font-bold rounded-xl text-xs transition-all shadow-sm flex items-center justify-center gap-2"
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
                className="py-2.5 px-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-[#16305C] font-bold rounded-lg text-xs transition-all"
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
    <div className="min-h-screen bg-slate-100 pb-12 sm:pt-8 sm:px-4 flex justify-center font-sans">
      <div className="w-full max-w-[400px] bg-white sm:rounded-[38px] sm:shadow-2xl overflow-hidden flex flex-col relative min-h-[100dvh] sm:min-h-[750px] border border-slate-200">
        
        {isDemoFallback && (
          <div className="bg-amber-500 text-white text-[10px] uppercase tracking-wider font-bold text-center py-1.5 px-4 flex items-center justify-center gap-1.5 relative z-20">
            <span>⚡</span> Running on Local Demo Fallback (No Supabase Tag Found)
          </div>
        )}

        {/* Hardware Mockup Notch (Desktop preview) */}
        <div className="hidden sm:block absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-slate-100 rounded-b-2xl z-10"></div>
        
        {/* Hero Section */}
        <div className="bg-gradient-to-br from-[#16305C] to-[#3E5B85] text-white p-8 text-center pt-12 relative">
          <div className="absolute top-4 left-4 font-mono text-xs opacity-50">{record.tag_id}</div>
          <div className="relative w-20 h-20 mx-auto mb-4">
            <div className="absolute inset-0 bg-[#F17FB1] rounded-full animate-ping opacity-20"></div>
            <div className="absolute inset-0 bg-white/10 rounded-full flex items-center justify-center text-4xl border-2 border-[#F17FB1]">
              {record.avatar || '🧒'}
            </div>
          </div>
          <h1 className="text-2xl font-bold font-serif mb-2">{record.child_name || 'Child'}</h1>
          <p className="text-sm opacity-90 leading-snug max-w-[250px] mx-auto">{t.tagline}</p>
        </div>

        {/* Language Switcher */}
        <div className="flex gap-2 p-4 bg-[#F5EAF1] overflow-x-auto border-b border-[#DCE6F5] hide-scrollbar">
          {LANGS.map(l => (
            <button 
              key={l.code}
              onClick={() => setLang(l.code as LangCode)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${lang === l.code ? 'bg-[#16305C] text-white shadow-sm' : 'bg-white text-[#3E5B85] border border-[#DCE6F5]'}`}
            >
              {l.label}
            </button>
          ))}
        </div>

        {/* Info Body */}
        <div className="p-5 flex-1 flex flex-col gap-6">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#3E5B85] mb-3">{t.emergencyContacts}</h2>
            {record.contacts && record.contacts.length > 0 ? (
              record.contacts.map((c: any, i: number) => (
                <div key={i} className="flex items-center justify-between bg-white border border-[#DCE6F5] rounded-xl p-3 mb-2 shadow-sm">
                  <div>
                    <div className="font-semibold text-sm text-[#16305C]">{c.name}</div>
                    <div className="text-xs text-[#3E5B85]">{c.relation}</div>
                  </div>
                  <div className="flex gap-2">
                    {c.phone && (
                      <a href={`tel:${cleanPhone(c.phone)}`} className="w-9 h-9 rounded-full bg-[#2A5FD9] text-white flex items-center justify-center text-sm shadow-sm hover:bg-[#1E4CB8] transition-colors" title={t.call}>📞</a>
                    )}
                    {c.whatsapp && c.phone && (
                      <a href={`https://wa.me/${cleanPhone(c.phone).replace('+', '')}`} target="_blank" rel="noreferrer" className="w-9 h-9 rounded-full bg-[#25D366] text-white flex items-center justify-center text-sm shadow-sm hover:bg-[#20bd5a] transition-colors" title={t.whatsapp}>💬</a>
                    )}
                  </div>
                </div>
              ))
            ) : <p className="text-sm text-slate-500 italic">{t.noInfo}</p>}
          </div>

          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#3E5B85] mb-3">{t.medicalInfo}</h2>
            {hasMedical ? (
              <div className="bg-white border border-[#DCE6F5] rounded-xl p-4 shadow-sm text-sm text-[#16305C] space-y-2">
                {record.medical.allergies && <div><span className="font-bold">{t.allergies}:</span> {record.medical.allergies}</div>}
                {record.medical.conditions && <div><span className="font-bold">{t.conditions}:</span> {record.medical.conditions}</div>}
                {record.medical.notes && <div className="pt-2 mt-2 border-t border-slate-100 leading-relaxed"><span className="font-bold">{t.notes}:</span> <br/>{record.medical.notes}</div>}
              </div>
            ) : <p className="text-sm text-slate-500 italic">{t.noInfo}</p>}
          </div>

          {/* Finder Contact Details Form */}
          <div className="bg-[#FFF4FA] border border-[#F17FB1]/35 rounded-2xl p-4 shadow-sm">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-[#16305C] mb-1 flex items-center gap-1.5">
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
                  className="w-full p-2.5 text-xs border border-[#DCE6F5] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#E23F84] bg-white text-[#16305C]"
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
                    className="w-full p-2.5 text-xs border border-[#DCE6F5] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#E23F84] bg-white text-[#16305C]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">{t.finderNote}</label>
                  <input
                    type="text"
                    placeholder="e.g. At information desk"
                    value={customNote}
                    onChange={e => setCustomNote(e.target.value)}
                    className="w-full p-2.5 text-xs border border-[#DCE6F5] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#E23F84] bg-white text-[#16305C]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={!finderName.trim() && !finderPhone.trim() && !customNote.trim()}
                className="w-full mt-2 bg-[#16305C] hover:bg-[#3E5B85] text-white py-3 px-4 rounded-xl text-xs font-bold transition-all shadow-sm disabled:opacity-40"
              >
                {t.finderBtn}
              </button>
            </form>
          </div>

          <div className="mt-auto pt-4">
            <button 
              onClick={handleShareLocation}
              className="w-full bg-[#E23F84] text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 shadow-md hover:bg-[#C22E6E] active:scale-[0.98] transition-all"
            >
              📍 {t.shareLocation}
            </button>
            <p className="text-center text-xs text-[#3E5B85] mt-3 min-h-4 font-medium leading-relaxed">{shareStatus}</p>

            {showLocationFallback && (
              <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-2xl text-left text-[#16305C] animate-fadeIn">
                <p className="text-xs font-extrabold uppercase text-amber-800 mb-1 flex items-center gap-1">
                  <span>💡</span> Sandbox Geolocation Helper
                </p>
                <p className="text-[11px] text-slate-600 mb-3 leading-relaxed">
                  Web browser policies block live GPS inside sandboxed developer previews. Use these 100% functional simulator options instead:
                </p>
                
                <div className="space-y-2">
                  <button
                    onClick={() => handleSimulatedLocation(-26.1062, 28.0536, 'Sandton, Johannesburg')}
                    className="w-full py-2.5 px-3 bg-white hover:bg-slate-50 border border-slate-200 text-xs font-bold rounded-lg transition-colors flex items-center justify-between text-[#16305C] shadow-sm"
                  >
                    <span>🏙️ Send Sandton, JHB GPS link</span>
                    <span className="text-slate-400">→</span>
                  </button>
                  <button
                    onClick={() => handleSimulatedLocation(-33.9249, 18.4241, 'Waterfront, Cape Town')}
                    className="w-full py-2.5 px-3 bg-white hover:bg-slate-50 border border-slate-200 text-xs font-bold rounded-lg transition-colors flex items-center justify-between text-[#16305C] shadow-sm"
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
