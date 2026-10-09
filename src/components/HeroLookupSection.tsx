import React, { useState } from 'react';
import { Timer, Gift, ChevronDown, AlertCircle, ArrowRight } from 'lucide-react';
import { CustomerPolicy } from '../types/insurance';
import { 
  getCustomerByPolicyOrMobile, 
  apiGetCustomers, 
  syncWithCentralServer, 
  logActivity 
} from '../services/storageService';

interface HeroLookupSectionProps {
  onCustomerFound: (customer: CustomerPolicy) => void;
}

export const HeroLookupSection: React.FC<HeroLookupSectionProps> = ({ onCustomerFound }) => {
  const [activeOption, setActiveOption] = useState<'policy' | 'mobile'>('policy');
  const [policyInput, setPolicyInput] = useState('');
  const [mobileInput, setMobileInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const query = activeOption === 'policy' ? policyInput.trim() : mobileInput.trim();

    if (!query) {
      setErrorMsg(`Please update correct ${activeOption === 'policy' ? 'Policy Number' : '10-digit Mobile Number'}.`);
      return;
    }

    if (activeOption === 'mobile' && query.replace(/\D/g, '').length < 10) {
      setErrorMsg('Please update correct 10-digit registered mobile number.');
      return;
    }

    setIsSearching(true);

    try {
      // 1. Check local storage / memory first
      let match = getCustomerByPolicyOrMobile(query);

      // 2. If not found, fetch live from backend central server (to catch policies created from Admin Portal)
      if (!match) {
        const apiResults = await apiGetCustomers(query).catch(() => []);
        if (apiResults && apiResults.length > 0) {
          match = apiResults[0];
        }
      }

      // 3. If still not found, do full server sync and try one more time
      if (!match) {
        await syncWithCentralServer();
        match = getCustomerByPolicyOrMobile(query);
      }

      setIsSearching(false);

      if (match) {
        logActivity({
          customerId: match.id,
          policyNumber: match.policyNumber,
          customerName: match.customerName,
          action: 'Policy Lookup Executed',
          category: 'Lookup',
          status: 'Success',
          details: `Policy found for ${match.customerName} via ${activeOption}`
        });

        onCustomerFound(match);

        setTimeout(() => {
          const el = document.getElementById('customer-policy-details-section');
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }, 150);
      } else {
        // Strict requirement: Do NOT create any fallback customer. Nothing should be opened.
        logActivity({
          customerId: 'UNKNOWN',
          policyNumber: query,
          customerName: 'Unregistered Visitor',
          action: 'Policy Lookup Failed',
          category: 'Lookup',
          status: 'Failed',
          details: `Lookup failed for unkeyed/invalid ${activeOption}: ${query}`
        });
        setErrorMsg('Please update correct policy number or mobile number. No active policy found matching this detail.');
      }
    } catch (err) {
      setIsSearching(false);
      setErrorMsg('Please update correct policy number or mobile number.');
    }
  };

  const setSampleData = (query: string, type: 'policy' | 'mobile') => {
    setActiveOption(type);
    if (type === 'policy') {
      setPolicyInput(query);
    } else {
      setMobileInput(query);
    }
    setErrorMsg('');

    const match = getCustomerByPolicyOrMobile(query);
    if (match) {
      onCustomerFound(match);
      setTimeout(() => {
        const el = document.getElementById('customer-policy-details-section');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 150);
    }
  };

  return (
    <div id="renewal-lookup-section" className="relative bg-[#002B49] text-white py-16 px-4 sm:px-6 lg:px-12 overflow-hidden min-h-[500px] flex items-center font-sans">
      
      <div className="max-w-7xl mx-auto w-full relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        
        {/* Left Headline Section matching the image exactly */}
        <div className="lg:col-span-6 space-y-8">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-light text-white leading-[1.15] tracking-tight font-sans">
            Renew my <br />
            <span className="font-light text-white">health policy</span>
          </h1>

          <div className="space-y-4 pt-2">
            
            {/* Sub-feature 1: Quick and easy renewal| */}
            <div className="flex items-center gap-4">
              <div className="w-9 h-9 rounded-full border border-white/40 flex items-center justify-center shrink-0 text-white">
                <Timer className="w-5 h-5 text-white stroke-[1.5]" />
              </div>
              <span className="text-lg sm:text-xl text-white font-light tracking-wide">
                Quick and easy renewal<span className="animate-pulse font-normal">|</span>
              </span>
            </div>

            {/* Sub-feature 2: Avail renewal benefits */}
            <div className="flex items-center gap-4">
              <div className="w-9 h-9 rounded-full border border-white/40 flex items-center justify-center shrink-0 text-white">
                <Gift className="w-5 h-5 text-white stroke-[1.5]" />
              </div>
              <span className="text-lg sm:text-xl text-white font-light tracking-wide">
                Avail renewal benefits
              </span>
            </div>

          </div>
        </div>

        {/* Right Policy Retrieval Form matching image exactly */}
        <div className="lg:col-span-6 max-w-md lg:ml-auto w-full">
          <div className="space-y-6">
            
            <form onSubmit={handleLookup} className="space-y-6">
              
              {/* Renew with Label & Dropdown */}
              <div className="space-y-1">
                <label className="text-xs text-slate-300 font-light block">
                  Renew with
                </label>
                <div className="relative border-b border-[#2C527B] pb-1">
                  <select
                    value={activeOption}
                    onChange={(e) => {
                      setActiveOption(e.target.value as 'policy' | 'mobile');
                      setErrorMsg('');
                    }}
                    className="w-full bg-transparent text-white text-lg font-normal outline-none appearance-none cursor-pointer pr-8"
                  >
                    <option value="policy" className="bg-[#002B49] text-white">Policy number</option>
                    <option value="mobile" className="bg-[#002B49] text-white">Registered mobile number</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-300 absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* ICICI Lombard policy number input with underline */}
              <div className="space-y-1">
                <div className="border-b border-[#2C527B] focus-within:border-white py-1 transition-colors">
                  {activeOption === 'policy' ? (
                    <input
                      id="input-policy-number"
                      type="text"
                      value={policyInput}
                      onChange={(e) => setPolicyInput(e.target.value)}
                      placeholder="ICICI Lombard policy number*"
                      className="w-full bg-transparent text-white placeholder-slate-300 text-base outline-none font-light py-1"
                    />
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-slate-300 text-base font-light">+91</span>
                      <input
                        id="input-mobile-number"
                        type="tel"
                        value={mobileInput}
                        onChange={(e) => setMobileInput(e.target.value.replace(/\D/g, ''))}
                        placeholder="10-digit mobile number*"
                        className="w-full bg-transparent text-white placeholder-slate-300 text-base outline-none font-light py-1"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Subtext Note */}
              <p className="text-[12px] text-slate-300 font-light leading-relaxed">
                You can get your existing policy number through your policy document
              </p>

              {/* Error Alert */}
              {errorMsg && (
                <div className="p-3 rounded bg-rose-900/80 border border-rose-500/50 text-rose-100 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-300 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Proceed Button */}
              <div className="pt-4">
                <button
                  id="lookup-proceed-btn"
                  type="submit"
                  disabled={isSearching}
                  className="bg-[#EA580C] hover:bg-[#d84d00] text-white text-base font-medium px-10 py-3 rounded-full shadow-lg transition-all cursor-pointer disabled:opacity-70 flex items-center justify-center gap-2"
                >
                  {isSearching ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <span>Proceed</span>
                  )}
                </button>
              </div>

            </form>

          </div>
        </div>

      </div>

      {/* Floating Bottom Right ASK RIA LIVE CHAT Widget matching the uploaded image */}
      <div className="fixed bottom-4 right-4 z-40 hidden sm:flex items-center gap-2 bg-[#001D33] text-white p-1.5 pr-4 rounded-full border border-white/20 shadow-2xl hover:scale-105 transition-transform cursor-pointer" onClick={() => alert('Ask RIA Live Assistant initialized')}>
        <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-amber-400 to-orange-500 overflow-hidden border-2 border-white flex items-center justify-center shrink-0">
          <span className="text-slate-950 font-black text-xs">RIA</span>
        </div>
        <div className="flex flex-col">
          <span className="text-[11px] font-extrabold text-white leading-tight uppercase tracking-wider">ASK RIA</span>
          <span className="text-[9px] text-emerald-400 font-semibold leading-tight">LIVE CHAT</span>
        </div>
      </div>

    </div>
  );
};

