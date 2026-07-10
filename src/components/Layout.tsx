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
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="bg-[#16305C] text-white p-1.5 rounded-lg group-hover:bg-[#3E5B85] transition-colors font-serif font-black text-xl px-3 pb-2 pt-1 leading-none">
              F
            </div>
            <span className="font-bold text-xl tracking-tight text-[#16305C] font-serif">FindMe</span>
          </Link>
          <nav className="flex gap-1">
            <Link 
              to="/dashboard" 
              className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${location.pathname.startsWith('/dashboard') || location.pathname.startsWith('/claim') ? 'bg-[#F5EAF1] text-[#E23F84]' : 'text-[#3E5B85] hover:bg-slate-50'}`}
            >
              Dashboard
            </Link>
            <Link 
              to="/admin" 
              className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${location.pathname === '/admin' ? 'bg-[#F5EAF1] text-[#E23F84]' : 'text-[#3E5B85] hover:bg-slate-50'}`}
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
