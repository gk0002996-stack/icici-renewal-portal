import React, { useState } from 'react';
import { User, ShieldCheck, X, ArrowRight, Lock, KeyRound } from 'lucide-react';

interface LoginModalProps {
  onClose: () => void;
  onLoginSuccess: (userType: 'customer' | 'admin', identifier: string) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ onClose, onLoginSuccess }) => {
  const [role, setRole] = useState<'customer' | 'admin'>('customer');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('123456');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) return;

    if (role === 'customer' && !otpSent) {
      setOtpSent(true);
      return;
    }

    onLoginSuccess(role, identifier);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 font-sans">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden space-y-0 animate-scaleUp">
        
        {/* Header */}
        <div className="bg-[#00264A] text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#EA580C] text-white flex items-center justify-center font-black">
              IL
            </div>
            <div>
              <h3 className="font-extrabold text-base text-white">ICICI Lombard Portal Login</h3>
              <p className="text-[11px] text-slate-300 font-medium">Customer & Agent Access</p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            className="p-1 rounded-full text-slate-300 hover:text-white hover:bg-white/10 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Role Switcher */}
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl text-xs font-bold">
            <button
              type="button"
              onClick={() => { setRole('customer'); setOtpSent(false); }}
              className={`py-2 rounded-lg transition-all cursor-pointer ${
                role === 'customer' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Policyholder Login
            </button>
            <button
              type="button"
              onClick={() => { setRole('admin'); setOtpSent(false); }}
              className={`py-2 rounded-lg transition-all cursor-pointer ${
                role === 'admin' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Agent / Admin Login
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 text-xs font-medium">
            {role === 'customer' ? (
              <>
                {!otpSent ? (
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">
                      Policy Number or Registered Mobile Number *
                    </label>
                    <input
                      type="text"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="e.g. 4128/0000/1234/5678 or 9876543210"
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold text-slate-900 outline-none focus:border-[#EA580C]"
                      required
                    />
                    <p className="text-[10px] text-slate-500 mt-1">An instant OTP will be sent to your registered mobile number.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="text-center">
                      <span className="text-slate-500 text-xs">OTP sent to +91 {identifier}</span>
                      <input
                        type="text"
                        maxLength={6}
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                        className="w-full text-center text-xl font-bold font-mono py-2 rounded-xl border border-slate-300 mt-2"
                        required
                      />
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Agent / Admin Employee ID *</label>
                  <input
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="e.g. AGENT-1049"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold text-slate-900 outline-none focus:border-[#EA580C]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Security Password *</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold text-slate-900 outline-none focus:border-[#EA580C]"
                    required
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3 bg-[#EA580C] hover:bg-[#D97706] text-white font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <span>{role === 'customer' ? (otpSent ? 'Verify OTP & Continue' : 'Send One Time Password') : 'Login to Admin Console'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

        </div>

      </div>
    </div>
  );
};
