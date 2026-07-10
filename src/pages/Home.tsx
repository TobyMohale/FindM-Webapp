import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Home() {
  const [tagId, setTagId] = useState('demo01');
  const navigate = useNavigate();

  const handleSimulate = (e: React.FormEvent) => {
    e.preventDefault();
    if (tagId) {
      window.open(`/t/${tagId}`, '_blank');
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] bg-slate-50 p-4 md:p-8 flex items-center justify-center">
      <div className="max-w-5xl w-full grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        
        <div>
          <h1 className="text-5xl font-black font-serif text-[#16305C] mb-2">FindMe</h1>
          <p className="text-sm font-bold uppercase tracking-widest text-[#E23F84] mb-6">— prototype</p>
          
          <p className="text-lg text-[#3E5B85] leading-relaxed mb-6 font-medium">
            A working demo of the tap flow: what a finder sees, and how a parent sets it up themselves — no app, no reprogramming the physical tag.
          </p>

          <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-200 mb-8">
            <h2 className="text-xl font-bold text-[#16305C] mb-3">Simulate a tap</h2>
            <p className="text-sm text-slate-500 mb-6 leading-relaxed">
              This loads with a made-up example already set up — Amo Dlamini — so you can see a fully populated finder view immediately. Try switching languages and tapping "share location." Enter a different Tag ID to load another one, or use the one you just created under Parent setup.
            </p>

            <form onSubmit={handleSimulate} className="flex gap-3 items-end">
              <div className="flex-1">
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Tag ID</label>
                <input 
                  type="text" 
                  value={tagId}
                  onChange={(e) => setTagId(e.target.value)}
                  className="w-full p-3 border border-slate-200 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-[#16305C]"
                />
              </div>
              <button type="submit" className="bg-[#16305C] text-white px-6 py-3 rounded-lg font-bold hover:bg-[#3E5B85] transition-colors whitespace-nowrap h-[46px] shadow-sm">
                Simulate tap
              </button>
            </form>
          </div>

          <p className="text-sm text-slate-500 leading-relaxed italic border-l-4 border-slate-200 pl-4">
            This phone mockup is exactly what a stranger, teacher, or security guard would see on their own phone the moment they tap the physical wristband or card — no app install, just a webpage.
            <br/><br/>
            The language pills, contact buttons and location-share button are all fully functional in this prototype.
          </p>
        </div>

        <div className="flex flex-col items-center justify-center pt-8 md:pt-0">
          <div className="flex flex-wrap justify-center gap-4 mb-8">
             <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 bg-white px-6 py-3 rounded-xl shadow-sm border border-slate-200 font-bold text-[#16305C] hover:bg-slate-50 transition-colors">
               ⚙️ Parent setup
             </button>
             <button onClick={() => navigate('/admin')} className="flex items-center gap-2 bg-white px-6 py-3 rounded-xl shadow-sm border border-slate-200 font-bold text-[#16305C] hover:bg-slate-50 transition-colors">
               🖨️ Batch Admin
             </button>
          </div>
          
          {/* Iframe mockup */}
          <div className="relative w-[340px] h-[700px] bg-[#1a1a1a] rounded-[44px] border-[12px] border-[#1a1a1a] shadow-2xl overflow-hidden ring-1 ring-slate-200/50">
            {/* iPhone Notch */}
            <div className="absolute top-0 inset-x-0 h-6 bg-[#1a1a1a] z-20 rounded-b-2xl w-32 mx-auto"></div>
            {/* Dynamic Iframe */}
            <iframe 
              src={`/t/${tagId}`} 
              className="w-full h-full bg-slate-100 border-none rounded-[32px] relative z-10"
              title="Finder View"
            />
          </div>
        </div>

      </div>
    </div>
  );
}
