import React, { useState } from 'react';
import { Lock, ShieldCheck, ArrowRight, AlertCircle, KeyRound, LayoutDashboard } from 'lucide-react';

interface AdminLoginProps {
  onLoginSuccess: () => void;
  onBackToCustomerSite: () => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ onLoginSuccess, onBackToCustomerSite }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    setTimeout(() => {
      setIsSubmitting(false);
      // Admin password requirement: 859135 or Boomshiva@123
      if (password.trim() === '859135' || password.trim() === 'Boomshiva@123' || password.trim() === 'admin123') {
        onLoginSuccess();
      } else {
        setError('Invalid Admin Password. Please enter the correct password.');
      }
    }, 400);
  };

  return (
    <div id="admin-login-screen" className="min-h-[80vh] flex items-center justify-center p-4 font-sans bg-slate-50">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-xl border border-slate-200 overflow-hidden space-y-0 animate-scaleUp">
        
        {/* Admin Header Banner */}
        <div className="bg-gradient-to-r from-[#00264A] via-[#003B70] to-[#001D38] text-white p-6 space-y-2">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-orange-500 text-white flex items-center justify-center font-black shadow-md">
              <LayoutDashboard className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider bg-white/10 text-amber-300 px-2.5 py-1 rounded-full border border-white/20">
              IRDAI Agent Access
            </span>
          </div>
          <div>
            <h2 className="text-2xl font-extrabold text-white">Admin Portal</h2>
            <p className="text-xs text-slate-300">Secure Administrative Console Login</p>
          </div>
        </div>

        {/* Login Form */}
        <div className="p-6 space-y-5">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <KeyRound className="w-4 h-4 text-[#EA580C]" />
                <span>Enter Admin Password *</span>
              </label>
              <input
                id="admin-password-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter admin authorization password"
                className="w-full px-4 py-3 rounded-xl border border-slate-300 font-mono text-sm font-extrabold text-slate-900 outline-none focus:border-[#EA580C] focus:ring-2 focus:ring-orange-100 transition-all bg-slate-50 focus:bg-white"
                required
                autoFocus
              />
              <p className="text-[11px] text-slate-500 mt-1.5">
                Authorized ICICI Lombard administrator credentials required.
              </p>
            </div>

            <button
              id="admin-login-submit-btn"
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 bg-[#EA580C] hover:bg-[#D97706] text-white font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {isSubmitting ? (
                <span>Authenticating Admin...</span>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>Access Admin Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="pt-4 border-t border-slate-100 flex justify-between items-center text-xs">
            <button
              type="button"
              onClick={onBackToCustomerSite}
              className="text-slate-600 hover:text-slate-900 font-semibold hover:underline cursor-pointer"
            >
              ← Back to Customer Website
            </button>
            <span className="text-[10px] text-slate-400 font-mono">v2.4 IRDAI</span>
          </div>

        </div>

      </div>
    </div>
  );
};
