import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setMessage('Passwords do not match. Please try again.');
      setIsSuccess(false);
      return;
    }
    if (password.length < 6) {
      setMessage('Password must be at least 6 characters.');
      setIsSuccess(false);
      return;
    }

    setLoading(true);
    setMessage('');

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setMessage(error.message || 'Failed to update your password. The link may have expired.');
      setIsSuccess(false);
    } else {
      setIsSuccess(true);
      setMessage('Your password has been successfully updated! You can now log in with your new credentials.');
      // Remove mock reset flag if any
      localStorage.removeItem('findme_mock_reset_email');
    }
    setLoading(false);
  };

  return (
    <div id="reset-password-page" className="min-h-[calc(100vh-64px)] bg-[#FDFBF7] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Morphing Liquid Background Blobs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[10%] left-[-10%] w-[350px] h-[350px] bg-[#FFCFF1] opacity-[0.5] blur-[80px] animate-morph-blob-1 rounded-full"></div>
        <div className="absolute bottom-[15%] right-[-10%] w-[350px] h-[350px] bg-[#C54B8C] opacity-[0.2] blur-[90px] animate-morph-blob-2 rounded-full"></div>
      </div>

      <div id="reset-password-card" className="max-w-md w-full glass-liquid-card p-8 rounded-3xl shadow-2xl relative overflow-hidden z-10">
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#FFCFF1] to-transparent opacity-40 rounded-bl-full pointer-events-none"></div>
        
        <div className="w-12 h-12 bg-[#FFCFF1] text-[#C54B8C] rounded-2xl flex items-center justify-center font-serif font-bold text-2xl mb-4 relative z-10 shadow-inner">
          L
        </div>

        <h2 className="text-3xl font-black text-[#051650] mb-2 font-serif relative z-10 uppercase tracking-tight">
          Reset Password
        </h2>
        <p className="text-slate-500 mb-6 text-sm relative z-10 leading-relaxed">
          Create a strong, unique new password for your LoTap account.
        </p>

        {isSuccess ? (
          <div className="space-y-4 relative z-10">
            <div className="p-4 bg-green-50 border border-green-200 text-green-800 rounded-2xl text-xs font-semibold leading-relaxed">
              {message}
            </div>
            <button
              onClick={() => navigate('/dashboard')}
              className="w-full bg-[#051650] text-white p-4 rounded-xl font-bold uppercase tracking-wide hover:bg-[#0A2472] transition-colors shadow-md shadow-[#051650]/15"
            >
              Go to Portal →
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="relative z-10 space-y-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">New Password</label>
              <input
                type="password"
                placeholder="••••••••"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#C54B8C] focus:bg-white text-sm text-[#051650] font-medium transition-all"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Confirm New Password</label>
              <input
                type="password"
                placeholder="••••••••"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#C54B8C] focus:bg-white text-sm text-[#051650] font-medium transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !password || !confirmPassword}
              className="w-full bg-[#051650] text-white p-4 rounded-xl font-bold uppercase tracking-wide hover:bg-[#0A2472] transition-colors disabled:opacity-50 shadow-md shadow-[#051650]/15 mt-2"
            >
              {loading ? 'Updating Password...' : 'Save Password'}
            </button>

            {message && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-semibold leading-relaxed">
                {message}
              </div>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
