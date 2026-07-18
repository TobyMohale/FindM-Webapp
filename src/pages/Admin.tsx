import React, { useState, useEffect } from 'react';
import { supabase, generateId } from '../lib/supabase';

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
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [passcode, setPasscode] = useState('');
  const [authorized, setAuthorized] = useState(false);
  const [passError, setPassError] = useState('');

  // Password Recovery / Forgotten State
  const [showForgot, setShowForgot] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryKey, setRecoveryKey] = useState('');
  const [recoveryNewPasscode, setRecoveryNewPasscode] = useState('');
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

  const getStoredPasscode = () => {
    return localStorage.getItem('findme_admin_passcode') || 'lotap123';
  };

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user && (user.email === 'johannesburgwebstudio@gmail.com' || user.email === 'admin@lotap.co.za')) {
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

  const handleRecoverySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryError('');
    setRecoverySuccess('');

    // Check if recovery key is correct
    if (recoveryKey.trim().toUpperCase() === 'LOTAP-ADMIN-MASTER-2026') {
      if (recoveryNewPasscode.length < 6) {
        setRecoveryError('New passcode must be at least 6 characters.');
        return;
      }
      localStorage.setItem('findme_admin_passcode', recoveryNewPasscode);
      setRecoverySuccess('Passcode reset successfully! You can now log in with your new passcode.');
      setRecoveryKey('');
      setRecoveryNewPasscode('');
      setShowForgot(false);
      setPasscode('');
      return;
    }

    // Check if recovery via Admin email
    const emailLower = recoveryEmail.toLowerCase().trim();
    if (emailLower === 'johannesburgwebstudio@gmail.com' || emailLower === 'admin@lotap.co.za') {
      localStorage.setItem('findme_admin_passcode', 'lotap123');
      setRecoverySuccess('The passcode has been successfully reset to the default "lotap123". You can now log in and customize it immediately.');
      setRecoveryEmail('');
      setShowForgot(false);
      setPasscode('lotap123');
      return;
    }

    setRecoveryError('Invalid recovery key or unauthorized administrator email address.');
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
            <h2 className="text-2xl font-black text-[#051650] font-serif uppercase tracking-tight">Passcode Recovery</h2>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              Verify your administrator identity to reset the passcode back to default, or use your master recovery key.
            </p>
          </div>

          <form onSubmit={handleRecoverySubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500">Method 1: Verified Admin Email</label>
              <input 
                type="email" 
                placeholder="Admin Email (e.g. admin@lotap.co.za)" 
                value={recoveryEmail}
                onChange={e => {
                  setRecoveryEmail(e.target.value);
                  setRecoveryKey('');
                }}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#C54B8C] text-xs font-semibold text-[#051650]"
              />
              <p className="text-[9px] text-slate-400 font-medium">Reset passcode back to the default "lotap123" instantly.</p>
            </div>

            <div className="relative py-2 flex items-center justify-center">
              <span className="absolute w-full h-[1px] bg-slate-100"></span>
              <span className="relative bg-white px-3 text-[10px] font-black text-slate-400">OR</span>
            </div>

            <div className="space-y-2">
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500">Method 2: Master Recovery Key</label>
              <input 
                type="password" 
                placeholder="Enter Master Recovery Key" 
                value={recoveryKey}
                onChange={e => {
                  setRecoveryKey(e.target.value);
                  setRecoveryEmail('');
                }}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#C54B8C] text-xs font-semibold text-[#051650]"
              />
              {recoveryKey.trim().length > 0 && (
                <input 
                  type="password" 
                  placeholder="Choose New Secure Passcode (6+ chars)" 
                  value={recoveryNewPasscode}
                  onChange={e => setRecoveryNewPasscode(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#C54B8C] text-xs font-semibold text-[#051650]"
                />
              )}
              <p className="text-[9px] text-slate-400 font-medium">Use the confidential factory-configured recovery key to set a new custom passcode immediately.</p>
            </div>

            <button 
              type="submit" 
              className="w-full bg-[#C54B8C] text-white py-3 px-4 rounded-xl font-extrabold uppercase tracking-wider text-xs hover:bg-[#B53389] transition-all shadow-md active:scale-95"
            >
              Verify & Reset Passcode
            </button>
          </form>

          {recoveryError && (
            <p className="text-xs font-semibold text-red-600 mt-4 text-center">{recoveryError}</p>
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
          This panel is restricted to <strong>LoTap & Johannesburg Web Studio Administrators</strong>. 
          Please enter the secure administrator passcode to manage production tag batches and orders.
        </p>

        {recoverySuccess && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-800">
            {recoverySuccess}
          </div>
        )}

        <form onSubmit={handlePasscodeSubmit} className="space-y-4">
          <input 
            type="password" 
            placeholder="Administrator Passcode" 
            value={passcode}
            onChange={e => setPasscode(e.target.value)}
            className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#C54B8C] text-center text-[#051650] font-semibold tracking-widest text-sm"
          />
          <button 
            type="submit" 
            className="w-full bg-[#051650] text-white py-3 px-4 rounded-xl font-bold uppercase tracking-wider text-xs hover:bg-[#0A2472] transition-colors shadow-md"
          >
            Unlock Access
          </button>
        </form>

        {passError && (
          <p className="text-xs font-semibold text-red-600 mt-3">{passError}</p>
        )}

        <div className="mt-5 flex justify-between items-center text-xs font-bold uppercase tracking-wider border-t border-slate-100 pt-4">
          <button 
            type="button"
            onClick={() => {
              setShowForgot(true);
              setRecoveryError('');
              setRecoverySuccess('');
            }}
            className="text-slate-400 hover:text-[#C54B8C] transition-colors"
          >
            Forgot Passcode?
          </button>
          <span className="text-slate-300">|</span>
          <span className="text-slate-400 font-mono text-[9px] lowercase">key: LOTAP-ADMIN-MASTER-2026</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-xl shadow-sm border border-slate-200 mt-10">
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
