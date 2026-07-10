import React, { useState, useEffect } from 'react';
import { supabase, generateId } from '../lib/supabase';

export default function Admin() {
  const [batchSize, setBatchSize] = useState(100);
  const [loading, setLoading] = useState(false);
  const [generatedBatch, setGeneratedBatch] = useState<any[]>([]);
  
  const [metrics, setMetrics] = useState({ total: 0, claimed: 0, unclaimed: 0 });

  useEffect(() => {
    fetchMetrics();
  }, []);

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
      + generatedBatch.map(t => `https://findme.co.za/t/${t.tag_id}`).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `findme_batch_${new Date().getTime()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-xl shadow-sm border border-slate-200 mt-10">
      <h1 className="text-2xl font-bold text-[#16305C] mb-2">Internal Admin: Batch Generation</h1>
      <p className="text-sm text-slate-500 mb-8">Generate unique tag IDs for factory production. Self-service tool.</p>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="p-5 bg-[#F5EAF1] rounded-lg border border-[#DCE6F5]">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#3E5B85] mb-1">Total Tags</h3>
          <p className="text-3xl font-bold text-[#16305C]">{metrics.total}</p>
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
        <h2 className="text-lg font-semibold text-[#16305C] mb-4">Generate New Batch</h2>
        <div className="flex items-end gap-4">
          <div className="flex-1">
            <label className="block text-xs font-bold uppercase text-slate-500 mb-2">Batch Size</label>
            <input 
              type="number" 
              value={batchSize} 
              onChange={(e) => setBatchSize(Number(e.target.value))}
              className="w-full p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16305C]"
            />
          </div>
          <button 
            onClick={handleGenerate}
            disabled={loading || batchSize <= 0}
            className="bg-[#16305C] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#3E5B85] transition-colors disabled:opacity-50"
          >
            {loading ? 'Generating...' : 'Generate Codes'}
          </button>
        </div>

        {generatedBatch.length > 0 && (
          <div className="mt-6 pt-6 border-t border-slate-200">
            <div className="flex justify-between items-center mb-4">
              <span className="text-sm font-semibold text-green-600">✓ Successfully generated {generatedBatch.length} codes</span>
              <button onClick={handleExportCSV} className="bg-[#E23F84] text-white px-4 py-2 rounded-lg font-semibold text-sm hover:bg-[#C22E6E] transition-colors shadow-sm">
                Download CSV for Factory
              </button>
            </div>
            <div className="bg-white border border-slate-200 rounded p-4 h-40 overflow-y-auto font-mono text-sm text-slate-600 shadow-inner">
              {generatedBatch.slice(0, 10).map(t => <div key={t.tag_id}>https://findme.co.za/t/{t.tag_id}</div>)}
              {generatedBatch.length > 10 && <div className="text-slate-400 mt-2">...and {generatedBatch.length - 10} more</div>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
