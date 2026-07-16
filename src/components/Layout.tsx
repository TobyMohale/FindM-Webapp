import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';

export default function Layout() {
  const location = useLocation();
  const isTapView = location.pathname.startsWith('/t/');

  if (isTapView) {
    return <Outlet />; // Tap view has no global header to remain lightweight and distraction-free
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group select-none">
            <span className="font-black text-2xl tracking-tight text-[#051650] flex items-center gap-1.5 leading-none">
              <span className="relative inline-block pb-1.5">
                Lo
                {/* Wavy ripple line underneath Lo */}
                <span className="absolute bottom-0 left-0 right-0 h-2 overflow-hidden">
                  <svg viewBox="0 0 100 20" preserveAspectRatio="none" className="w-full h-full text-[#C54B8C] fill-none stroke-[#C54B8C] stroke-[8px]">
                    <path d="M 0 10 Q 25 20, 50 10 T 100 10" />
                  </svg>
                </span>
              </span>
              <span className="text-[#C54B8C]">Tap</span>
            </span>
          </Link>
          <nav className="flex items-center gap-3 sm:gap-6">
            <Link 
              to="/" 
              className={`text-xs font-black tracking-wider uppercase transition-all ${location.pathname === '/' ? 'text-[#C54B8C]' : 'text-[#0A2472] hover:text-[#C54B8C]'}`}
            >
              HOME
            </Link>
            <a 
              href="#about" 
              className="text-xs font-black tracking-wider uppercase text-[#0A2472] hover:text-[#C54B8C] transition-all"
            >
              ABOUT
            </a>

            
            <Link 
              to="/dashboard" 
              className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${location.pathname.startsWith('/dashboard') || location.pathname.startsWith('/claim') ? 'bg-[#FFCFF1] text-[#C54B8C]' : 'bg-[#051650] text-white hover:bg-[#0A2472]'}`}
            >
              Set Up
            </Link>
            <Link 
              to="/admin" 
              className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-colors ${location.pathname === '/admin' ? 'bg-[#FFCFF1] text-[#C54B8C]' : 'text-blue-600 hover:bg-blue-50'}`}
            >
              Admin
            </Link>
          </nav>
        </div>
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}
