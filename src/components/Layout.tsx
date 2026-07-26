import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';

export default function Layout() {
  const location = useLocation();
  const isTapView = location.pathname.startsWith('/t/');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('lotap_theme') as 'light' | 'dark') || 
           (localStorage.getItem('dashboard-theme') as 'light' | 'dark') || 'light';
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  useEffect(() => {
    const handleThemeChange = () => {
      const saved = (localStorage.getItem('lotap_theme') as 'light' | 'dark') || 
                    (localStorage.getItem('dashboard-theme') as 'light' | 'dark') || 'light';
      setTheme(saved);
      document.documentElement.classList.toggle('dark', saved === 'dark');
    };
    window.addEventListener('theme-change', handleThemeChange);
    return () => window.removeEventListener('theme-change', handleThemeChange);
  }, []);

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    localStorage.setItem('lotap_theme', next);
    localStorage.setItem('dashboard-theme', next);
    document.documentElement.classList.toggle('dark', next === 'dark');
    window.dispatchEvent(new Event('theme-change'));
  };

  if (isTapView) {
    return <Outlet />; // Tap view has no global header to remain lightweight and distraction-free
  }

  const handleLinkClick = () => {
    setMobileMenuOpen(false);
  };

  return (
    <div className={`min-h-screen flex flex-col font-sans transition-colors duration-300 ${
      theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
    }`}>
      <header className={`backdrop-blur-md border-b sticky top-0 z-[1000] shadow-xs transition-all duration-300 ${
        theme === 'dark' 
          ? 'bg-slate-900/90 border-slate-800/80 text-white' 
          : 'bg-white/85 border-slate-200/80 text-slate-900'
      }`}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group select-none" onClick={handleLinkClick}>
            <span className={`font-black text-2xl tracking-tight flex items-center gap-1.5 leading-none ${
              theme === 'dark' ? 'text-white' : 'text-[#051650]'
            }`}>
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

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-5">
            <Link 
              to="/" 
              className={`text-xs font-black tracking-wider uppercase transition-all ${
                location.pathname === '/' 
                  ? 'text-[#C54B8C]' 
                  : theme === 'dark' 
                    ? 'text-slate-200 hover:text-[#FFCFF1]' 
                    : 'text-[#0A2472] hover:text-[#C54B8C]'
              }`}
            >
              HOME
            </Link>
            <Link 
              to="/about"
              className={`text-xs font-black tracking-wider uppercase transition-all ${
                location.pathname === '/about' 
                  ? 'text-[#C54B8C]' 
                  : theme === 'dark' 
                    ? 'text-slate-200 hover:text-[#FFCFF1]' 
                    : 'text-[#0A2472] hover:text-[#C54B8C]'
              }`}
            >
              ABOUT
            </Link>
            {location.pathname !== '/admin' && (
              <>
                <a 
                  href="/#order"
                  onClick={(e) => {
                    if (location.pathname === '/') {
                      e.preventDefault();
                      const el = document.getElementById('order');
                      if (el) {
                        el.scrollIntoView({ behavior: 'smooth' });
                      }
                    }
                  }}
                  className={`text-xs font-black tracking-wider uppercase text-[#C54B8C] transition-all flex items-center gap-1 px-3 py-1.5 rounded-full border ${
                    theme === 'dark'
                      ? 'bg-[#C54B8C]/20 border-[#C54B8C]/40 text-[#FFCFF1] hover:bg-[#C54B8C]/40'
                      : 'bg-[#FFCFF1]/50 border-[#C54B8C]/30 hover:bg-[#FFCFF1] text-[#C54B8C]'
                  }`}
                >
                  🛒 ORDER
                </a>
                <Link 
                  to="/dashboard" 
                  className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${
                    location.pathname.startsWith('/dashboard') || location.pathname.startsWith('/claim') 
                      ? 'bg-[#FFCFF1] text-[#C54B8C]' 
                      : theme === 'dark'
                        ? 'bg-[#C54B8C] text-white hover:bg-[#B33B7B]'
                        : 'bg-[#051650] text-white hover:bg-[#0A2472]'
                  }`}
                >
                  Set Up
                </Link>
              </>
            )}
            <Link 
              to="/admin" 
              className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-colors ${
                location.pathname === '/admin' 
                  ? 'bg-[#FFCFF1] text-[#C54B8C]' 
                  : theme === 'dark'
                    ? 'text-sky-400 hover:bg-slate-800'
                    : 'text-blue-600 hover:bg-blue-50'
              }`}
            >
              Admin
            </Link>
            <button
              onClick={toggleTheme}
              className={`p-1.5 rounded-xl border transition-all text-sm flex items-center justify-center cursor-pointer shadow-xs ${
                theme === 'dark'
                  ? 'bg-slate-800 border-slate-700 text-amber-300 hover:bg-slate-700'
                  : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
              }`}
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-label="Toggle dark / light mode"
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
          </nav>

          {/* Mobile Hamburguer Toggle Button */}
          <button 
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className={`md:hidden p-2 rounded-xl transition-all ${
              theme === 'dark'
                ? 'text-slate-200 hover:text-[#FFCFF1] hover:bg-slate-800'
                : 'text-[#051650] hover:text-[#C54B8C] hover:bg-slate-100/50'
            }`}
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X size={20} className="stroke-[2.5]" /> : <Menu size={20} className="stroke-[2.5]" />}
          </button>
        </div>

        {/* Mobile Dropdown Navigation */}
        {mobileMenuOpen && (
          <div className={`md:hidden border-t py-4 px-4 shadow-lg animate-fade-in space-y-3 absolute left-0 right-0 top-16 z-50 ${
            theme === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-100 text-slate-900'
          }`}>
            <div className="flex flex-col gap-2">
              <Link 
                to="/" 
                onClick={handleLinkClick}
                className={`p-3 rounded-xl text-xs font-black tracking-wider uppercase transition-all ${
                  location.pathname === '/' 
                    ? 'bg-[#FFCFF1]/40 text-[#C54B8C]' 
                    : theme === 'dark'
                      ? 'text-slate-200 hover:bg-slate-800'
                      : 'text-[#0A2472] hover:bg-slate-50'
                }`}
              >
                HOME
              </Link>
              <Link 
                to="/about"
                onClick={handleLinkClick}
                className={`p-3 rounded-xl text-xs font-black tracking-wider uppercase transition-all ${
                  location.pathname === '/about' 
                    ? 'bg-[#FFCFF1]/40 text-[#C54B8C]' 
                    : theme === 'dark'
                      ? 'text-slate-200 hover:bg-slate-800'
                      : 'text-[#0A2472] hover:bg-slate-50'
                }`}
              >
                ABOUT
              </Link>
              {location.pathname !== '/admin' && (
                <>
                  <a 
                    href="/#order"
                    onClick={(e) => {
                      handleLinkClick();
                      if (location.pathname === '/') {
                        e.preventDefault();
                        const el = document.getElementById('order');
                        if (el) {
                          el.scrollIntoView({ behavior: 'smooth' });
                        }
                      }
                    }}
                    className="p-3 rounded-xl text-xs font-black tracking-wider uppercase transition-all bg-[#FFCFF1]/60 text-[#C54B8C] hover:bg-[#FFCFF1] flex items-center justify-center gap-1.5"
                  >
                    🛒 ORDER WRISTBAND
                  </a>
                  <Link 
                    to="/dashboard" 
                    onClick={handleLinkClick}
                    className={`p-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all text-center ${
                      location.pathname.startsWith('/dashboard') || location.pathname.startsWith('/claim') 
                        ? 'bg-[#FFCFF1] text-[#C54B8C]' 
                        : 'bg-[#051650] text-white hover:bg-[#0A2472]'
                    }`}
                  >
                    Set Up PORTAL
                  </Link>
                </>
              )}
              <Link 
                to="/admin" 
                onClick={handleLinkClick}
                className={`p-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors text-center ${
                  location.pathname === '/admin' 
                    ? 'bg-[#FFCFF1] text-[#C54B8C]' 
                    : theme === 'dark'
                      ? 'text-sky-400 hover:bg-slate-800'
                      : 'text-blue-600 hover:bg-blue-50'
                }`}
              >
                Admin
              </Link>
              <button
                onClick={() => { handleLinkClick(); toggleTheme(); }}
                className={`p-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 border cursor-pointer ${
                  theme === 'dark'
                    ? 'bg-slate-800 border-slate-700 text-amber-300'
                    : 'bg-slate-100 border-slate-200 text-slate-700'
                }`}
              >
                <span>{theme === 'dark' ? '☀️' : '🌙'}</span>
                <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
              </button>
            </div>
          </div>
        )}
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}
