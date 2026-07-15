import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import lotapCover from '../assets/images/silicone_wristband_mockup_1784122040773.jpg';

export default function Home() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ name: '', number: '', bands: '' });
  const [selectedColor, setSelectedColor] = useState('#051650');
  const [activeTab, setActiveTab] = useState<string | null>('contacts');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert('Thank you! We will be in touch soon regarding your LoTap bands.');
    setFormData({ name: '', number: '', bands: '' });
  };

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#FDFBF7] font-sans text-[#051650] relative overflow-hidden">
      {/* Background paper lines effect to pay homage to the school notebook */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.04]" style={{
        backgroundImage: 'linear-gradient(#051650 1px, transparent 1px)',
        backgroundSize: '100% 28px'
      }}></div>

      {/* Morphing Liquid Background Blobs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[8%] left-[-15%] w-[450px] h-[450px] bg-[#FFCFF1] opacity-[0.45] blur-[90px] animate-morph-blob-1 rounded-full"></div>
        <div className="absolute top-[40%] right-[-15%] w-[500px] h-[500px] bg-[#C54B8C] opacity-[0.18] blur-[100px] animate-morph-blob-2 rounded-full"></div>
        <div className="absolute bottom-[10%] left-[-10%] w-[480px] h-[480px] bg-[#051650] opacity-[0.08] blur-[110px] animate-morph-blob-3 rounded-full"></div>
        <div className="absolute top-[75%] left-[30%] w-[400px] h-[400px] bg-[#FFCFF1] opacity-[0.25] blur-[80px] animate-morph-blob-1 rounded-full"></div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-12 md:py-20 relative z-10" id="about">
        
        {/* Main Hero Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start mb-20">
          
          {/* Left Column: Sketch Layout elements */}
          <div className="space-y-8">
            <div>
              {/* Main Headline */}
              <h1 className="text-5xl md:text-6xl font-black text-[#051650] tracking-tight leading-none uppercase select-none">
                ONE TAP.<br />
                <span className="text-[#C54B8C] relative inline-block">
                  PEACE OF MIND!
                  {/* Subtle underline stroke */}
                  <span className="absolute bottom-0 left-0 right-0 h-[4px] bg-[#C54B8C] rounded"></span>
                </span>
              </h1>
            </div>

            {/* Wavy text lines placeholder from the draft */}
            <div className="p-5 glass-liquid-card rounded-2xl shadow-sm space-y-4 relative">
              <span className="absolute top-2 right-3 text-[9px] font-black tracking-widest text-slate-300 uppercase select-none">
                Draft Placeholder
              </span>
              
              <div className="space-y-2.5">
                {/* Wavy lines constructed with SVG paths */}
                <svg className="w-full h-3 text-[#FFCFF1]" viewBox="0 0 400 12" preserveAspectRatio="none">
                  <path d="M 0 6 Q 10 12, 20 6 T 40 6 T 60 6 T 80 6 T 100 6 T 120 6 T 140 6 T 160 6 T 180 6 T 200 6 T 220 6 T 240 6 T 260 6 T 280 6 T 300 6 T 320 6 T 340 6 T 360 6 T 380 6 T 400 6" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                </svg>
                <svg className="w-full h-3 text-[#FFCFF1]" viewBox="0 0 400 12" preserveAspectRatio="none">
                  <path d="M 0 6 Q 10 12, 20 6 T 40 6 T 60 6 T 80 6 T 100 6 T 120 6 T 140 6 T 160 6 T 180 6 T 200 6 T 220 6 T 240 6 T 260 6 T 280 6 T 300 6 T 320 6 T 340 6 T 360 6 T 380 6 T 400 6" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                </svg>
                <svg className="w-5/6 h-3 text-[#FFCFF1]" viewBox="0 0 350 12" preserveAspectRatio="none">
                  <path d="M 0 6 Q 10 12, 20 6 T 40 6 T 60 6 T 80 6 T 100 6 T 120 6 T 140 6 T 160 6 T 180 6 T 200 6 T 220 6 T 240 6 T 260 6 T 280 6 T 300 6 T 320 6 T 340 6" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                </svg>
              </div>

              {/* Set Up button (Pill shaped, matching draft button "SET UP") */}
              <div className="pt-2 flex flex-wrap items-center gap-4">
                <button 
                  onClick={() => navigate('/dashboard')} 
                  className="bg-[#051650] text-white px-8 py-3 rounded-full font-black text-xs uppercase tracking-wider hover:bg-[#0A2472] transition-all shadow-md shadow-[#051650]/20"
                >
                  SET UP PORTAL
                </button>
              </div>

              {/* Set Up / Claim Code Input */}
              <div className="pt-4 border-t border-[#FFCFF1]/40 mt-4">
                <p className="text-xs font-bold text-[#051650] uppercase tracking-wider mb-2">Have a physical wristband?</p>
                <form onSubmit={(e) => {
                  e.preventDefault();
                  const targetCode = (e.currentTarget.elements.namedItem('code') as HTMLInputElement).value.trim().toUpperCase();
                  if (targetCode.length === 6) {
                    navigate(`/t/${targetCode}`);
                  } else {
                    alert('Please enter a valid 6-character code.');
                  }
                }} className="flex gap-2 max-w-sm">
                  <input 
                    name="code"
                    type="text"
                    maxLength={6}
                    placeholder="Enter 6-char code (e.g. AB12CD)"
                    className="flex-1 px-4 py-2.5 bg-white border border-[#FFCFF1] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#C54B8C] text-xs font-bold text-[#051650] uppercase placeholder:normal-case transition-all shadow-inner"
                  />
                  <button 
                    type="submit"
                    className="bg-[#C54B8C] text-white px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-opacity-90 transition-all shadow-sm"
                  >
                    GO
                  </button>
                </form>
              </div>

              {/* Arrow pointing from wavy lines placeholder to value prop quote */}
              <div className="absolute left-10 -bottom-8 w-16 h-12 text-[#C54B8C] hidden md:block">
                <svg viewBox="0 0 50 50" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full transform rotate-12">
                  <path d="M10,5 C25,20 20,35 15,45" />
                  <polyline points="10,38 15,45 23,41" />
                </svg>
              </div>
            </div>

            {/* Core Value Proposition Box (where arrow points) */}
            <div className="p-6 bg-[#FFCFF1]/30 border-l-4 border-[#C54B8C] rounded-r-2xl">
              <p className="text-md sm:text-lg text-[#051650] font-bold italic leading-relaxed font-sans">
                "You can't guarantee that your child will remember who to call in an emergency but you can assure they will with LoTap."
              </p>
            </div>
          </div>

          {/* Right Column: Visual wristband showcase with premium gradient glow */}
          <div className="relative pt-6">
            <div className="absolute inset-0 bg-gradient-to-tr from-[#051650] to-[#C54B8C] rounded-3xl transform rotate-3 scale-105 opacity-20 blur-xl"></div>
            
            <img 
              src={lotapCover} 
              alt="LoTap child wristband mockup" 
              className="relative z-10 rounded-3xl shadow-2xl border-4 border-white w-full object-cover aspect-[4/3]"
              referrerPolicy="no-referrer"
            />

            {/* Specifications badge below the image */}
            <div className="relative z-10 mt-6 text-center md:text-left glass-liquid-card-dark p-6 rounded-2xl shadow-xl text-white">
              <p className="text-sm font-black text-[#FFCFF1] uppercase tracking-wider mb-2 flex items-center gap-1.5 justify-center md:justify-start">
                <span>🏷️</span> Features & Specifications
              </p>
              <p className="text-xs text-white leading-relaxed font-semibold">
                Soft, hypoallergenic dual-color silicone band featuring a secure, integrated built-in NFC chip for lightning-fast child safety scans. Waterproof, comfortable, and always ready to protect.
              </p>
            </div>
          </div>

        </div>

        {/* INTERACTIVE DEMO & WRISTBAND PRESENTATION SECTION */}
        <div className="my-24 glass-liquid-card rounded-[40px] p-6 md:p-12 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-64 h-64 bg-gradient-to-br from-[#FFCFF1]/20 to-transparent pointer-events-none rounded-br-full"></div>
          
          <div className="text-center mb-12 relative z-10">
            <span className="text-xs font-extrabold uppercase tracking-widest text-[#C54B8C] bg-[#FFCFF1]/30 px-4 py-1.5 rounded-full">
              Interactive Showcase
            </span>
            <h2 className="text-3xl md:text-4xl font-black text-[#051650] uppercase mt-4 mb-2 tracking-tight">
              See How It Works
            </h2>
            <p className="text-slate-500 text-sm max-w-lg mx-auto leading-relaxed">
              Customize the physical LoTap band design on the left, and interact with the live phone simulator on the right to see what displays when the tag is physically tapped or scanned.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start relative z-10">
            
            {/* Left Column: Flat Band SVG and Interactive Color Picker (5 Cols) */}
            <div className="lg:col-span-5 space-y-8">
              <div className="bg-[#FDFBF7] p-6 rounded-3xl border border-slate-100 shadow-inner space-y-6">
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider text-[#051650]">
                    1. Choose Band Color
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Select a high-contrast hue matching your child's favorite style.
                  </p>
                </div>

                {/* Color Swatches Grid */}
                <div className="flex flex-wrap gap-2.5">
                  {[
                    { name: 'Deep Blue', value: '#051650', bg: 'bg-[#051650]' },
                    { name: 'Mulberry Pink', value: '#C54B8C', bg: 'bg-[#C54B8C]' },
                    { name: 'Active Red', value: '#DC2626', bg: 'bg-red-600' },
                    { name: 'Forest Green', value: '#059669', bg: 'bg-emerald-600' },
                  ].map((c) => (
                    <button
                      key={c.name}
                      type="button"
                      onClick={() => setSelectedColor(c.value)}
                      title={c.name}
                      className={`w-9 h-9 rounded-full ${c.bg} transition-all duration-300 relative ${selectedColor === c.value ? 'scale-110 ring-4 ring-[#FFCFF1] shadow-md' : 'hover:scale-105 opacity-80 hover:opacity-100'}`}
                    >
                      {selectedColor === c.value && (
                        <span className="absolute inset-0 flex items-center justify-center text-white text-[10px]">✓</span>
                      )}
                    </button>
                  ))}
                </div>

                {/* Flat Vector Schematic representation of safety band */}
                <div className="py-6 border-y border-slate-200/60">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-3">
                    Flat Schematic Layout
                  </span>
                  
                  {/* Flat Band SVG container */}
                  <div className="relative p-4 bg-white rounded-2xl border border-slate-100 shadow-sm flex items-center justify-center overflow-hidden">
                    <svg viewBox="0 0 450 60" className="w-full h-auto transition-all duration-300" style={{ fill: selectedColor }}>
                      {/* Main band base strap */}
                      <rect x="15" y="18" width="420" height="24" rx="12" />
                      
                      {/* Left circular loop hole */}
                      <circle cx="28" cy="30" r="10" fill="#FDFBF7" />
                      <circle cx="28" cy="30" r="8" fill="none" stroke="#e2e8f0" strokeWidth="1" />

                      {/* Central wide NFC sensor capsule */}
                      <rect x="160" y="8" width="130" height="44" rx="22" fill={selectedColor} stroke="white" strokeWidth="2.5" />
                      
                      {/* Left wave ripples */}
                      <path d="M 175 22 Q 170 30, 175 38" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" opacity="0.6" />
                      <path d="M 182 18 Q 175 30, 182 42" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" opacity="0.8" />
                      <path d="M 189 14 Q 180 30, 189 46" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" />

                      {/* Right wave ripples */}
                      <path d="M 275 22 Q 280 30, 275 38" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" opacity="0.6" />
                      <path d="M 268 18 Q 275 30, 268 42" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" opacity="0.8" />
                      <path d="M 261 14 Q 270 30, 261 46" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" />

                      {/* NFC Antenna Core Transmitter Logo */}
                      <g transform="translate(213, 18)">
                        {/* Wireless Transmitter Symbol */}
                        <path d="M 12 11 A 3 3 0 0 1 12 17" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                        <path d="M 12 8 A 6 6 0 0 1 12 20" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                        <path d="M 12 5 A 9 9 0 0 1 12 23" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                        <circle cx="12" cy="14" r="1.5" fill="white" />
                      </g>
                      
                      {/* Adjustment sizing pin holes on the right strap */}
                      <circle cx="320" cy="30" r="3" fill="#FDFBF7" />
                      <circle cx="335" cy="30" r="3" fill="#FDFBF7" />
                      <circle cx="350" cy="30" r="3" fill="#FDFBF7" />
                      <circle cx="365" cy="30" r="3" fill="#FDFBF7" />
                      <circle cx="380" cy="30" r="3" fill="#FDFBF7" />
                      <circle cx="395" cy="30" r="3" fill="#FDFBF7" />
                      <circle cx="410" cy="30" r="3" fill="#FDFBF7" />
                      
                      {/* Rightmost circle hook */}
                      <rect x="422" y="18" width="16" height="24" rx="8" fill={selectedColor} />
                    </svg>
                  </div>
                </div>

                {/* Hand Wearing Band Representation */}
                <div className="relative">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2.5">
                    Wrist Preview Simulation
                  </span>
                  <div className="h-28 bg-white rounded-2xl border border-slate-100 shadow-sm relative flex items-center justify-center overflow-hidden">
                    {/* Mock wrist skin color container */}
                    <div className="absolute w-2/3 h-14 bg-[#FAE1D0] rounded-lg -rotate-6 flex items-center justify-between px-6 shadow-sm border border-[#E9C4AC]">
                      {/* Wrist crease detail */}
                      <div className="w-1.5 h-8 bg-[#E9C4AC] rounded-full opacity-60"></div>
                      
                      {/* Wristband overlay matching selected color */}
                      <div className="absolute inset-y-0 left-12 w-10 transition-all duration-300 shadow-md relative flex items-center justify-center border-x border-white/20" style={{ backgroundColor: selectedColor }}>
                        {/* Tiny customizer white lines representing central NFC logo */}
                        <div className="flex flex-col gap-1 items-center justify-center">
                          <div className="w-4 h-0.5 bg-white/70 rounded"></div>
                          <div className="w-2 h-0.5 bg-white/50 rounded"></div>
                        </div>
                      </div>

                      <div className="w-1.5 h-8 bg-[#E9C4AC] rounded-full opacity-60"></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Highlight bullet features */}
              <div className="bg-[#FFCFF1]/10 p-5 rounded-2xl border border-[#C54B8C]/10 space-y-3">
                <p className="text-xs font-bold uppercase tracking-wider text-[#C54B8C] flex items-center gap-1.5">
                  <span>🔒</span> Safe, Standalone Tech
                </p>
                <ul className="text-xs text-slate-600 space-y-2 list-disc pl-4 leading-relaxed font-medium">
                  <li>No subscriptions, download trackers, or monthly charges.</li>
                  <li>Hypoallergenic medical silicone, waterproof & sweatproof.</li>
                  <li>Equipped with premium dual NFC and QR technologies.</li>
                </ul>
              </div>
            </div>

            {/* Right Column: Live Smartphone Frame showing Emma's active profile (7 Cols) */}
            <div className="lg:col-span-7">
              <div className="max-w-sm mx-auto">
                <span className="text-center block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2.5">
                  📱 Tap Live Demonstration (Click to Test)
                </span>

                {/* Smartphone Chassis Frame */}
                <div className="bg-slate-900 p-4 rounded-[48px] shadow-2xl border-[6px] border-slate-800 relative overflow-hidden">
                  
                  {/* Dynamic Island / Notch */}
                  <div className="absolute top-6 left-1/2 transform -translate-x-1/2 w-32 h-6 bg-black rounded-full z-30 flex items-center justify-center">
                    <div className="w-3 h-3 bg-slate-900 rounded-full ml-1"></div>
                  </div>

                  {/* Phone Screen Container */}
                  <div className="bg-white rounded-[36px] overflow-hidden min-h-[520px] relative text-[#051650] flex flex-col font-sans select-none">
                    
                    {/* Status Bar */}
                    <div className="bg-slate-50 pt-6 pb-2.5 px-6 flex justify-between items-center border-b border-slate-100 text-[10px] font-black tracking-wider text-slate-400">
                      <span>9:41 📡</span>
                      <span>LOTAP ACTIVE</span>
                      <span>🔋 100%</span>
                    </div>

                    {/* Medical Header Block inside reference phone */}
                    <div className="bg-slate-50 p-4 border-b border-slate-100 text-center relative">
                      <div className="absolute top-2 right-2 w-8 h-8 opacity-10">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-red-600">
                          <path d="M12 2L12 22M2 12L22 12M12 7H17M12 17H17" />
                        </svg>
                      </div>
                      
                      <h4 className="text-[11px] font-black uppercase tracking-tight text-[#051650] leading-tight">
                        Stores Phone Numbers, Allergies,<br/> & Important Information
                      </h4>
                      <p className="text-[9px] font-bold text-[#C54B8C] uppercase tracking-wider mt-0.5">
                        Kids May Not Remember
                      </p>
                      
                      <div className="text-[10px] font-black text-red-600 tracking-wider uppercase mt-1.5 flex items-center justify-center gap-2">
                        <span>No Apps.</span>
                        <span>•</span>
                        <span>No Fees.</span>
                        <span>•</span>
                        <span>No Batteries.</span>
                      </div>
                    </div>

                    {/* Main Child Profile Info */}
                    <div className="p-5 flex-1 flex flex-col items-center text-center">
                      
                      {/* Avatar with Red Cross overlay */}
                      <div className="relative mb-3">
                        <div className="w-20 h-20 bg-[#FFCFF1]/40 rounded-full flex items-center justify-center text-4xl shadow-inner border-2 border-white">
                          👧
                        </div>
                        
                        {/* Red Star of Life Badge */}
                        <div className="absolute -bottom-1.5 -right-1.5 bg-white p-1 rounded-full shadow-md border border-red-100">
                          <svg className="w-5 h-5 text-red-600" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12,2 L14,2 L14,8 L19.5,4.5 L20.5,6 L15,10 L20.5,13.5 L19.5,15 L14,11.5 L14,17.5 L17.5,21 L16,22 L12,18.5 L8,22 L6.5,21 L10,17.5 L10,11.5 L4.5,15 L3.5,13.5 L9,10 L3.5,6 L4.5,4.5 L10,8 L10,2 Z" />
                          </svg>
                        </div>
                      </div>

                      <h3 className="text-xl font-extrabold text-[#051650] tracking-tight">
                        My name is Emma
                      </h3>
                      <p className="text-[11px] text-slate-500 font-medium leading-relaxed mt-1.5 max-w-xs px-2">
                        I've become separated from my family at the theme park, please use this information to immediately contact them!
                      </p>

                      {/* Interactive Custom pill accordion buttons from user's mockup */}
                      <div className="w-full space-y-2 mt-5">
                        
                        {/* Contact Tab */}
                        <div className="border border-slate-100 rounded-2xl overflow-hidden bg-slate-50">
                          <button
                            type="button"
                            onClick={() => setActiveTab(activeTab === 'contacts' ? null : 'contacts')}
                            className="w-full bg-[#0066FF] text-white p-3 font-black text-xs uppercase tracking-wider flex items-center justify-between px-5 hover:bg-[#0055DD] transition-colors"
                          >
                            <span>📞 Emergency Contacts</span>
                            <span className="text-xs">{activeTab === 'contacts' ? '▼' : '▶'}</span>
                          </button>
                          
                          {activeTab === 'contacts' && (
                            <div className="p-3 bg-white text-left text-xs border-t border-slate-100 divide-y divide-slate-100">
                              <div className="py-2 flex justify-between items-center">
                                <div>
                                  <p className="font-extrabold text-[#051650]">Sarah Robinson (Mom)</p>
                                  <p className="text-[10px] text-slate-400 font-semibold">Primary Guardian</p>
                                </div>
                                <a href="tel:+27825551234" className="bg-green-500 text-white px-3 py-1 rounded-full font-bold text-[10px] hover:bg-green-600 transition-colors uppercase">
                                  Call
                                </a>
                              </div>
                              <div className="py-2 flex justify-between items-center">
                                <div>
                                  <p className="font-extrabold text-[#051650]">Mark Robinson (Dad)</p>
                                  <p className="text-[10px] text-slate-400 font-semibold">Secondary Guardian</p>
                                </div>
                                <a href="tel:+27835559876" className="bg-green-500 text-white px-3 py-1 rounded-full font-bold text-[10px] hover:bg-green-600 transition-colors uppercase">
                                  Call
                                </a>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Medications Tab */}
                        <div className="border border-slate-100 rounded-2xl overflow-hidden bg-slate-50">
                          <button
                            type="button"
                            onClick={() => setActiveTab(activeTab === 'medications' ? null : 'medications')}
                            className="w-full bg-[#0066FF] text-white p-3 font-black text-xs uppercase tracking-wider flex items-center justify-between px-5 hover:bg-[#0055DD] transition-colors"
                          >
                            <span>💊 Medications</span>
                            <span className="text-xs">{activeTab === 'medications' ? '▼' : '▶'}</span>
                          </button>
                          
                          {activeTab === 'medications' && (
                            <div className="p-3 bg-white text-left text-xs border-t border-slate-100">
                              <p className="font-extrabold text-[#051650] mb-0.5">Asthma Inhaler</p>
                              <p className="text-slate-500 font-medium leading-relaxed">
                                Requires Ventolin pump in case of acute breathing distress. Inhaler is in the front pouch of the backpack.
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Allergies Tab */}
                        <div className="border border-slate-100 rounded-2xl overflow-hidden bg-slate-50">
                          <button
                            type="button"
                            onClick={() => setActiveTab(activeTab === 'allergies' ? null : 'allergies')}
                            className="w-full bg-[#0066FF] text-white p-3 font-black text-xs uppercase tracking-wider flex items-center justify-between px-5 hover:bg-[#0055DD] transition-colors"
                          >
                            <span>🥜 Allergies</span>
                            <span className="text-xs">{activeTab === 'allergies' ? '▼' : '▶'}</span>
                          </button>
                          
                          {activeTab === 'allergies' && (
                            <div className="p-3 bg-white text-left text-xs border-t border-slate-100">
                              <p className="font-extrabold text-red-600 mb-0.5">Strictly Peanuts & Penicillin</p>
                              <p className="text-slate-500 font-medium leading-relaxed">
                                Highly sensitive. May cause anaphylaxis. If exposed, administer EpiPen located in the safety pouch immediately.
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Hospital Tab */}
                        <div className="border border-slate-100 rounded-2xl overflow-hidden bg-slate-50">
                          <button
                            type="button"
                            onClick={() => setActiveTab(activeTab === 'hospital' ? null : 'hospital')}
                            className="w-full bg-[#0066FF] text-white p-3 font-black text-xs uppercase tracking-wider flex items-center justify-between px-5 hover:bg-[#0055DD] transition-colors"
                          >
                            <span>🏥 Hospital of Choice</span>
                            <span className="text-xs">{activeTab === 'hospital' ? '▼' : '▶'}</span>
                          </button>
                          
                          {activeTab === 'hospital' && (
                            <div className="p-3 bg-white text-left text-xs border-t border-slate-100">
                              <p className="font-extrabold text-[#051650] mb-0.5">Morningside Clinic, Sandton</p>
                              <p className="text-slate-500 font-medium leading-relaxed">
                                Medical Aid: Discovery Health KeyCare. Policy #998877221.
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Unlimited Tabs Tab */}
                        <div className="border border-slate-100 rounded-2xl overflow-hidden bg-slate-50">
                          <button
                            type="button"
                            onClick={() => setActiveTab(activeTab === 'unlimited' ? null : 'unlimited')}
                            className="w-full bg-red-600 text-white p-3 font-black text-xs uppercase tracking-wider flex items-center justify-between px-5 hover:bg-red-700 transition-colors"
                          >
                            <span>📋 Unlimited Custom Tabs</span>
                            <span className="text-xs">{activeTab === 'unlimited' ? '▼' : '▶'}</span>
                          </button>
                          
                          {activeTab === 'unlimited' && (
                            <div className="p-3 bg-white text-left text-xs border-t border-slate-100">
                              <p className="font-extrabold text-[#051650] mb-0.5">Extended Safety Metadata</p>
                              <p className="text-slate-500 font-medium leading-relaxed">
                                Parents can configure custom headings, emergency instruction logs, blood types, or school contact detail parameters from their portal instantly.
                              </p>
                            </div>
                          )}
                        </div>

                      </div>

                    </div>

                    {/* Interactive Device Footer Navigation */}
                    <div className="bg-slate-50 p-3 border-t border-slate-100 flex justify-center items-center gap-1 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                      <span>⚡ REAL-TIME DISCOVERY LINK PORTAL</span>
                    </div>

                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Call to Action Section - GET YOURS NOW */}
        <div className="max-w-2xl mx-auto glass-liquid-card p-8 md:p-12 rounded-[32px] shadow-2xl relative overflow-hidden mt-16">
          <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-[#FFCFF1]/40 to-transparent rounded-bl-full pointer-events-none"></div>

          {/* Form Header */}
          <div className="relative z-10 text-center mb-8">
            <h2 className="text-3xl font-black text-[#051650] uppercase tracking-widest font-serif leading-none mb-1">
              GET YOURS NOW
            </h2>
            <div className="w-16 h-1.5 bg-[#C54B8C] mx-auto rounded-full"></div>
          </div>

          {/* Cloud-shaped Callout with FILL FORM button inside */}
          <div className="flex justify-center mb-8">
            <div className="relative inline-flex items-center justify-center p-4 bg-white text-[#C54B8C] border-2 border-dashed border-[#C54B8C] rounded-full px-6 py-2 shadow-inner select-none animate-bounce">
              {/* Cloud styling decoration */}
              <div className="absolute -top-1.5 -left-1.5 w-4 h-4 bg-white rounded-full border-t-2 border-l-2 border-[#C54B8C]"></div>
              <div className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-white rounded-full border-t-2 border-r-2 border-[#C54B8C]"></div>
              <span className="text-xs font-black uppercase tracking-widest text-[#051650]">
                ☁️ FILL FORM
              </span>
            </div>
          </div>

          {/* Interactive Lead Capture Form */}
          <form onSubmit={handleSubmit} className="relative z-10 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">name</label>
                <input 
                  type="text" 
                  required
                  placeholder="Your Name"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#C54B8C] focus:bg-white text-xs font-semibold text-[#051650] transition-all"
                />
              </div>
              
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">number</label>
                <input 
                  type="tel" 
                  required
                  placeholder="Contact Number"
                  value={formData.number}
                  onChange={(e) => setFormData({...formData, number: e.target.value})}
                  className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#C54B8C] focus:bg-white text-xs font-semibold text-[#051650] transition-all"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">number of bands</label>
              <input 
                type="number" 
                min="1"
                required
                placeholder="How many safety wristbands do you need?"
                value={formData.bands}
                onChange={(e) => setFormData({...formData, bands: e.target.value})}
                className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#C54B8C] focus:bg-white text-xs font-semibold text-[#051650] transition-all"
              />
            </div>
            
            <button 
              type="submit" 
              className="w-full bg-[#C54B8C] text-white py-4 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-[#B53389] transition-all shadow-md shadow-[#C54B8C]/15"
            >
              Submit Order Inquiry
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}

