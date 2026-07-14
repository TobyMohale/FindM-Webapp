import React, { useState, useEffect } from 'react';
import { supabase, generateId } from '../lib/supabase';

export default function Admin() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [passcode, setPasscode] = useState('');
  const [authorized, setAuthorized] = useState(false);
  const [passError, setPassError] = useState('');

  const [batchSize, setBatchSize] = useState(100);
  const [loading, setLoading] = useState(false);
  const [generatedBatch, setGeneratedBatch] = useState<any[]>([]);
  
  const [metrics, setMetrics] = useState({ total: 0, claimed: 0, unclaimed: 0 });

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
  }, []);

  const handlePasscodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passcode.toLowerCase() === 'lotap123' || passcode === 'lotap2026') {
      setAuthorized(true);
      setPassError('');
    } else {
      setPassError('Invalid administrator passcode. Please try again.');
    }
  };

  const fetchMetrics = async () => {
    // In a real app we would use an RPC or agg query,
    // Here we will do a simple select for the prototype metrics
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
    return (
      <div className="max-w-md mx-auto p-8 bg-white rounded-3xl shadow-xl border border-slate-100 mt-16 text-center relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#FFCFF1] to-transparent opacity-40 rounded-bl-full pointer-events-none"></div>
        <div className="text-4xl mb-4">🔐</div>
        <h2 className="text-2xl font-black text-[#051650] mb-2 font-serif uppercase tracking-tight">Restricted Area</h2>
        <p className="text-xs text-slate-500 mb-6 leading-relaxed">
          This panel is restricted to <strong>LoTap & Johannesburg Web Studio Administrators</strong>. 
          Please log in using an authorized administrator email, or enter the bypass passcode.
        </p>

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

        <div className="mt-6 pt-5 border-t border-slate-100">
          <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
            Authorized admin credentials: <br/>
            <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">johannesburgwebstudio@gmail.com</span>
          </p>
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
            onClick={handleGenerate}
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
              <button onClick={handleExportCSV} className="bg-[#C54B8C] text-white px-4 py-2 rounded-lg font-semibold text-sm hover:bg-[#B53389] transition-colors shadow-sm">
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
    </div>
  );
}
