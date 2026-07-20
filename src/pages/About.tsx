import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Phone, Cpu, Zap, CheckCircle2, ChevronDown, Heart, Eye } from 'lucide-react';

export default function About() {
  const navigate = useNavigate();
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const faqs = [
    {
      q: "How does the LoTap wristband work?",
      a: "Each physical LoTap wristband is equipped with a secure, waterproof NFC (Near Field Communication) chip and a unique printed 6-character code. In an emergency, any passerby or finder can simply tap their smartphone against the wristband to immediately pull up the child's secure emergency contact card, without needing any special app installed."
    },
    {
      q: "Does the wristband track my child's location via GPS?",
      a: "No. LoTap wristbands do not contain a GPS tracker, battery, or cellular antenna. This ensures they are completely safe to wear, lightweight, waterproof, maintenance-free, and require zero charging. It operates on passive NFC technology that only displays parent-approved contact information when physically tapped or scanned by a finder."
    },
    {
      q: "Is my family's personal data secure and private?",
      a: "Yes, absolutely. Security and compliance are built into our DNA. Parents have absolute control over what details are public. You can share as much or as little information as you feel comfortable with (e.g., just a WhatsApp number and allergy warning). We adhere strictly to POPIA (Protection of Personal Information Act) requirements to protect your sensitive data."
    },
    {
      q: "Do I need to pay a monthly subscription?",
      a: "No! There are zero monthly fees or subscription costs associated with the basic contact portal. Once you purchase the physical wristband, registering it and hosting the finder portal is free for life."
    },
    {
      q: "What devices are compatible with the wristband?",
      a: "Almost all modern smartphones (including iPhones and Android devices) have built-in NFC scanners. For older devices that don't support NFC, the finder can quickly enter the 6-character code directly at lotap.co.za to view the profile."
    }
  ];

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#FDFBF7] font-sans text-[#051650] relative overflow-hidden pb-20">
      {/* Background paper lines effect */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.04]" style={{
        backgroundImage: 'linear-gradient(#051650 1px, transparent 1px)',
        backgroundSize: '100% 28px'
      }}></div>

      {/* Background Blobs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[5%] right-[-10%] w-[350px] h-[350px] bg-[#FFCFF1] opacity-[0.4] blur-[80px] rounded-full"></div>
        <div className="absolute bottom-[10%] left-[-10%] w-[400px] h-[400px] bg-[#C54B8C] opacity-[0.12] blur-[100px] rounded-full"></div>
      </div>

      <div className="max-w-4xl mx-auto px-4 pt-12 md:pt-16 relative z-10">
        
        {/* Header Block */}
        <div className="text-center mb-16">
          <span className="text-xs font-extrabold uppercase tracking-widest text-[#C54B8C] bg-[#FFCFF1]/40 px-4 py-1.5 rounded-full border border-[#C54B8C]/10">
            OUR MISSION
          </span>
          <h1 className="text-4xl md:text-5xl font-black text-[#051650] uppercase mt-4 mb-4 tracking-tight leading-none">
            RECONNECTING FAMILIES<br />
            <span className="text-[#C54B8C]">IN SECONDS</span>
          </h1>
          <p className="text-slate-600 font-semibold text-sm md:text-base max-w-2xl mx-auto leading-relaxed">
            We believe that child safety should be simple, reliable, and accessible. LoTap bridge the gap between physical safety wearables and instant digital communication.
          </p>
        </div>

        {/* Brand Promise Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center mb-20 bg-white p-8 rounded-3xl border border-slate-100 shadow-xs">
          <div className="space-y-4">
            <h2 className="text-2xl font-black text-[#051650] uppercase tracking-tight">
              Why LoTap Exists
            </h2>
            <p className="text-slate-600 text-xs md:text-sm leading-relaxed font-medium">
              In a busy mall, public beach, or school excursion, a child can disappear from sight in a blink of an eye. In these terrifying high-stress moments, young children often panic, forget telephone numbers, or are too frightened to speak to strangers.
            </p>
            <p className="text-slate-600 text-xs md:text-sm leading-relaxed font-medium">
              LoTap provides an immediate voice for your child when they need it most. By putting your contact information directly on a physical wearable, any kind finder can instantly get in touch with you and coordinate a safe reunion.
            </p>
          </div>
          <div className="bg-[#FFCFF1]/20 p-6 rounded-2xl border border-[#FFCFF1]/40 space-y-4">
            <div className="flex gap-3 items-start">
              <div className="p-2 bg-[#C54B8C] text-white rounded-lg shrink-0">
                <Shield size={18} />
              </div>
              <div>
                <h4 className="text-xs font-black uppercase text-[#051650]">POPIA Compliant</h4>
                <p className="text-[11px] text-slate-500 font-semibold mt-0.5">Control exactly what details the public can see. Update or disable them at any time.</p>
              </div>
            </div>
            <div className="flex gap-3 items-start">
              <div className="p-2 bg-[#051650] text-white rounded-lg shrink-0">
                <Phone size={18} />
              </div>
              <div>
                <h4 className="text-xs font-black uppercase text-[#051650]">Instant Messaging</h4>
                <p className="text-[11px] text-slate-500 font-semibold mt-0.5">Finders can trigger standard phone calls or one-click WhatsApp chats with parents.</p>
              </div>
            </div>
            <div className="flex gap-3 items-start">
              <div className="p-2 bg-[#C54B8C] text-white rounded-lg shrink-0">
                <Cpu size={18} />
              </div>
              <div>
                <h4 className="text-xs font-black uppercase text-[#051650]">Passive & Safe</h4>
                <p className="text-[11px] text-slate-500 font-semibold mt-0.5">No batteries, zero harmful radiation, and completely waterproof for constant peace of mind.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Visual Process Section */}
        <div className="mb-20">
          <h2 className="text-2xl font-black text-center text-[#051650] uppercase tracking-tight mb-10">
            How It Works in 3 Steps
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs hover:border-[#FFCFF1] transition-all relative">
              <span className="absolute -top-4 left-6 w-8 h-8 rounded-full bg-[#051650] text-white font-black text-xs flex items-center justify-center">
                1
              </span>
              <div className="pt-4 space-y-3">
                <div className="text-[#C54B8C] font-black text-sm uppercase">1. Wear It</div>
                <h3 className="font-extrabold text-sm text-[#051650]">Hypoallergenic Silicone</h3>
                <p className="text-slate-500 text-xs leading-relaxed">
                  Your child wears the premium silicone wristband. Built with a robust internal NFC microchip, it is secure, lightweight, and fully waterproof.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs hover:border-[#FFCFF1] transition-all relative">
              <span className="absolute -top-4 left-6 w-8 h-8 rounded-full bg-[#C54B8C] text-white font-black text-xs flex items-center justify-center">
                2
              </span>
              <div className="pt-4 space-y-3">
                <div className="text-[#051650] font-black text-sm uppercase">2. Register Portal</div>
                <h3 className="font-extrabold text-sm text-[#051650]">Quick Setup</h3>
                <p className="text-slate-500 text-xs leading-relaxed">
                  Claim your band's code in our online portal. Add emergency contact phone numbers, parents' names, and medical details or allergies.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs hover:border-[#FFCFF1] transition-all relative">
              <span className="absolute -top-4 left-6 w-8 h-8 rounded-full bg-[#051650] text-white font-black text-xs flex items-center justify-center">
                3
              </span>
              <div className="pt-4 space-y-3">
                <div className="text-[#C54B8C] font-black text-sm uppercase">3. Scan & Reunite</div>
                <h3 className="font-extrabold text-sm text-[#051650]">One-tap Scan</h3>
                <p className="text-slate-500 text-xs leading-relaxed">
                  A finder taps their phone against the band. Your configured details load instantly so they can call you immediately.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Specifications Table */}
        <div className="mb-20 bg-slate-50 border border-slate-200/60 p-6 md:p-8 rounded-3xl">
          <h2 className="text-xl font-black uppercase text-[#051650] mb-6 flex items-center gap-2">
            <span>🛠️</span> Technical Specifications
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs font-semibold">
            <div className="bg-white p-4 rounded-xl border border-slate-200/50 flex justify-between items-center">
              <span className="text-slate-500">Material</span>
              <span className="text-[#051650] font-extrabold text-right">Hypoallergenic Medical Silicone</span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200/50 flex justify-between items-center">
              <span className="text-slate-500">Wireless Connectivity</span>
              <span className="text-[#051650] font-extrabold text-right">NFC Forum Type 2 Passive tag</span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200/50 flex justify-between items-center">
              <span className="text-slate-500">Water Resistance</span>
              <span className="text-[#051650] font-extrabold text-right">IP68 (Fully Waterproof)</span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200/50 flex justify-between items-center">
              <span className="text-slate-500">Power Source</span>
              <span className="text-[#051650] font-extrabold text-right">None (Passive, zero charging required)</span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200/50 flex justify-between items-center">
              <span className="text-slate-500">Backup Option</span>
              <span className="text-[#051650] font-extrabold text-right">Unique 6-character Code</span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200/50 flex justify-between items-center">
              <span className="text-slate-500">Security Architecture</span>
              <span className="text-[#051650] font-extrabold text-right">POPIA Compliant Secure Backend</span>
            </div>
          </div>
        </div>

        {/* FAQs */}
        <div className="mb-16">
          <h2 className="text-2xl font-black text-center text-[#051650] uppercase tracking-tight mb-8">
            Frequently Asked Questions
          </h2>
          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <div 
                key={idx} 
                className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden transition-all duration-300"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="w-full p-5 text-left flex justify-between items-center font-extrabold text-sm md:text-base text-[#051650] hover:text-[#C54B8C] transition-all"
                >
                  <span>{faq.q}</span>
                  <ChevronDown 
                    size={18} 
                    className={`text-slate-400 shrink-0 transform transition-transform duration-300 ${openFaq === idx ? 'rotate-180 text-[#C54B8C]' : ''}`} 
                  />
                </button>
                {openFaq === idx && (
                  <div className="px-5 pb-5 pt-1 border-t border-slate-50/50 text-xs md:text-sm text-slate-500 leading-relaxed font-medium animate-fade-in">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Call to action */}
        <div className="text-center bg-[#FFCFF1]/30 p-8 md:p-12 rounded-[32px] border border-[#FFCFF1]/50 shadow-xs relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#C54B8C]/5 rounded-bl-full pointer-events-none"></div>
          <h3 className="text-xl md:text-2xl font-black text-[#051650] uppercase mb-3">
            Secure peace of mind for your family
          </h3>
          <p className="text-slate-600 text-xs md:text-sm max-w-lg mx-auto font-semibold mb-6">
            Equip your child with physical protection today. Secure their online dashboard card first and claim your code right away!
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
            <button
              onClick={() => navigate('/')}
              className="w-full sm:w-auto bg-[#C54B8C] text-white font-black text-xs uppercase tracking-wider px-8 py-3.5 rounded-full hover:bg-opacity-90 transition-all shadow-md shadow-[#C54B8C]/15"
            >
              ORDER WRISTBANDS
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              className="w-full sm:w-auto bg-[#051650] text-white font-black text-xs uppercase tracking-wider px-8 py-3.5 rounded-full hover:bg-opacity-90 transition-all shadow-md shadow-[#051650]/15"
            >
              SET UP PORTAL
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
