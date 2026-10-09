import React, { useState } from 'react';
import { UserCheck, ShieldCheck, ArrowRight, AlertCircle, KeyRound, Eye, EyeOff, ArrowLeft } from 'lucide-react';

interface AdvisorLoginProps {
  onLoginSuccess: () => void;
  onBackToCustomerSite: () => void;
}

export const AdvisorLogin: React.FC<AdvisorLoginProps> = ({ onLoginSuccess, onBackToCustomerSite }) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    setTimeout(() => {
      setIsSubmitting(false);
      // Specified password for advisor access: Lombard@3377 or Boomshiva@123
      if (password.trim() === 'Lombard@3377' || password.trim() === 'Boomshiva@123' || password.trim() === 'advisor123') {
        onLoginSuccess();
      } else {
        setError('Incorrect Advisor Password. Please enter the valid advisor password.');
      }
    }, 350);
  };

  return (
    <div id="advisor-login-screen" className="min-h-[82vh] flex items-center justify-center p-4 font-sans bg-slate-50">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden space-y-0">
        
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-[#00264A] via-[#003B70] to-[#001D38] text-white p-6 space-y-2">
          <div className="flex items-center justify-between">
            <div className="w-11 h-11 rounded-xl bg-[#EA580C] text-white flex items-center justify-center font-black shadow-md">
              <UserCheck className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider bg-white/15 text-orange-200 px-3 py-1 rounded-full border border-white/20">
              Advisor Portal Access
            </span>
          </div>
          <div>
            <h2 className="text-2xl font-extrabold text-white">Become an Advisor</h2>
            <p className="text-xs text-slate-300">Authorized Insurance Advisor & Link Creation Desk</p>
          </div>
        </div>

        {/* Login Form */}
        <div className="p-6 space-y-5">
          <div className="p-3.5 bg-blue-50/70 border border-blue-100 rounded-xl text-xs text-slate-600 flex items-start gap-2.5">
            <ShieldCheck className="w-5 h-5 text-[#003B70] shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-slate-800">Advisor Portal Security</p>
              <p className="text-[11px] text-slate-600 mt-0.5">
                Authorized advisors can create and share renewal and soft copy links directly for customers.
              </p>
            </div>
          </div>

          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <KeyRound className="w-4 h-4 text-[#EA580C]" />
                <span>Advisor Authorization Password *</span>
              </label>
              <div className="relative">
                <input
                  id="advisor-password-input"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter advisor password"
                  autoFocus
                  required
                  className="w-full px-3.5 py-2.5 pr-10 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#EA580C] focus:border-transparent outline-none transition bg-slate-50/50 hover:bg-white focus:bg-white text-slate-800 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[11px] text-slate-400 mt-1.5 flex items-center gap-1">
                <span>Enter authorization credential provided by ICICI Lombard</span>
              </p>
            </div>

            <button
              id="advisor-login-submit-btn"
              type="submit"
              disabled={isSubmitting || !password.trim()}
              className="w-full py-3 px-4 bg-gradient-to-r from-[#EA580C] to-[#C2410C] hover:from-[#C2410C] hover:to-[#9A3412] text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer active:scale-[0.99]"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  <span>Verifying Advisor Credential...</span>
                </>
              ) : (
                <>
                  <span>Open Advisor Link Creation Desk</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Footer Back Link */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
            <button
              id="advisor-back-to-home-btn"
              type="button"
              onClick={onBackToCustomerSite}
              className="text-slate-500 hover:text-slate-800 font-medium flex items-center gap-1 transition cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Customer Portal</span>
            </button>
            <span className="text-[11px] text-slate-400">IRDAI Reg. 115</span>
          </div>
        </div>

      </div>
    </div>
  );
};
