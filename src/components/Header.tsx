import React, { useState } from 'react';
import { 
  Phone, 
  PhoneCall, 
  ChevronDown, 
  ChevronRight, 
  FileText, 
  LayoutDashboard, 
  Menu, 
  X
} from 'lucide-react';
import { AppView } from '../types/insurance';

interface HeaderProps {
  currentView: AppView;
  setCurrentView: (view: AppView) => void;
  onOpenLogin: () => void;
  onOpenSoftCopy: () => void;
  onOpenAdvisor?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  setCurrentView,
  onOpenLogin,
  onOpenSoftCopy,
  onOpenAdvisor
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { label: 'Motor Insurance', key: 'motor' },
    { label: 'Health Insurance', key: 'health' },
    { label: 'Travel Insurance', key: 'travel' },
    { label: 'SME Insurance', key: 'sme' },
    { label: 'Corporate Insurance', key: 'corporate' },
    { label: 'Other Insurance', key: 'other' },
    { label: 'Renewals', key: 'renewals' },
    { label: 'Claims', key: 'claims' }
  ];

  const handleNavClick = (key: string) => {
    setMobileMenuOpen(false);
    if (key === 'renewals' || key === 'health') {
      setCurrentView('renew_flow');
    } else if (key === 'claims') {
      setCurrentView('claims_info');
    } else {
      alert(`The ${key.toUpperCase()} section is in preview mode. Health Insurance Online Renewal is live!`);
    }
  };

  return (
    <header id="app-header" className="sticky top-0 z-50 bg-white shadow-sm font-sans">
      
      {/* Top Utility Bar */}
      <div className="bg-[#F5F5F5] text-slate-800 text-[12px] py-1.5 px-4 border-b border-slate-200">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          
          {/* Left Support Contacts */}
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 font-bold text-slate-900">
              <Phone className="w-3.5 h-3.5 text-slate-700" />
              <span>1800 2666 <span className="font-normal text-slate-600">(Available 24 x 7)</span></span>
            </span>
            <span className="text-slate-300">|</span>
            <button 
              type="button"
              onClick={() => alert('Request Callback: Our insurance advisor will call you in 2 minutes.')}
              className="flex items-center gap-1 font-semibold text-slate-800 hover:text-[#EA580C] transition-colors cursor-pointer"
            >
              <PhoneCall className="w-3.5 h-3.5 text-slate-600" />
              <span>Call Back</span>
            </button>
            <span className="text-slate-300">|</span>
            <button 
              type="button"
              onClick={() => alert('Live Chat connected with ICICI Lombard RIA Assistant')}
              className="flex items-center gap-1.5 font-semibold text-slate-800 hover:text-[#EA580C] px-3 py-0.5 rounded-full bg-white border border-slate-300 shadow-2xs hover:border-slate-400 cursor-pointer"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
              <span>Live Chat</span>
            </button>
          </div>

          {/* Right Utility Navigation & Login */}
          <div className="hidden md:flex items-center gap-3 text-slate-700 text-[12px]">
            <button type="button" className="flex items-center gap-1 hover:text-[#EA580C] font-medium cursor-pointer">
              <span>Help</span>
              <ChevronDown className="w-3 h-3 text-slate-500" />
            </button>
            <button type="button" className="flex items-center gap-1 hover:text-[#EA580C] font-medium cursor-pointer">
              <span>Info Centre</span>
              <ChevronDown className="w-3 h-3 text-slate-500" />
            </button>
            <button type="button" className="hover:text-[#EA580C] font-medium cursor-pointer">
              <span>Investor Relations</span>
            </button>
            
            {/* Become an advisor Dark Navy Button */}
            <button 
              id="header-become-advisor-btn"
              type="button"
              onClick={() => {
                if (onOpenAdvisor) onOpenAdvisor();
                else setCurrentView('advisor_login');
              }}
              className="bg-[#002B49] hover:bg-[#001f35] text-white px-2.5 py-1 rounded font-semibold text-[11px] flex items-center gap-1 cursor-pointer transition-colors"
            >
              <span>Become an advisor</span>
              <ChevronRight className="w-3 h-3 text-white/80" />
            </button>

            {/* Login Orange Button */}
            <button
              id="header-top-login-btn"
              type="button"
              onClick={onOpenLogin}
              className="bg-[#EA580C] hover:bg-[#d84d00] text-white px-3 py-1 rounded font-bold text-[12px] cursor-pointer flex items-center gap-1 shadow-xs transition-colors"
            >
              <span>Login</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>
      </div>

      {/* Main Corporate Orange-Red Gradient Navigation Header */}
      <div className="bg-gradient-to-r from-[#D9381E] via-[#E85D04] to-[#F48C06] text-white py-2 px-4 shadow-sm">
        <div className="max-w-[1380px] mx-auto flex items-center justify-between">
          
          {/* Brand Logo & Navigation Links */}
          <div className="flex items-center gap-6">
            
            {/* ICICI Lombard Logo */}
            <div 
              className="flex items-center gap-2 cursor-pointer py-1 select-none shrink-0"
              onClick={() => setCurrentView('landing')}
            >
              <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-xs shrink-0">
                <span className="text-[#D9381E] font-serif font-black text-xl italic tracking-tighter leading-none">i</span>
              </div>
              <div className="flex items-center">
                <span className="font-extrabold text-2xl tracking-tight text-white font-sans">
                  ICICI <span className="font-semibold text-white">Lombard</span>
                </span>
              </div>
            </div>

            {/* Desktop Navigation Links matching the exact image */}
            <nav className="hidden xl:flex items-center space-x-2 text-[13px] font-semibold text-white ml-2">
              {navLinks.map((link) => {
                const isActive = (currentView === 'renew_flow' && (link.key === 'health' || link.key === 'renewals'));
                return (
                  <button
                    key={link.key}
                    id={`nav-${link.key}`}
                    type="button"
                    onClick={() => handleNavClick(link.key)}
                    className={`flex items-center gap-1 px-2 py-1 rounded transition-all cursor-pointer hover:bg-white/10 ${
                      isActive ? 'bg-white/20 font-bold text-white' : ''
                    }`}
                  >
                    <span>{link.label}</span>
                    <ChevronDown className="w-3.5 h-3.5 text-white/90" />
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Direct Soft Copy & Admin Dashboard Quick Actions */}
          <div className="hidden md:flex items-center space-x-2">
            <button
              id="header-softcopy-btn"
              type="button"
              onClick={onOpenSoftCopy}
              className={`px-3 py-1 text-xs font-semibold rounded border transition-all cursor-pointer flex items-center gap-1 ${
                currentView === 'soft_copy'
                  ? 'bg-amber-400 text-slate-950 border-amber-300 font-bold'
                  : 'bg-white/10 text-white hover:bg-white/20 border-white/30'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-amber-200" />
              <span>Soft Copy</span>
            </button>

            <button
              id="header-admin-btn"
              type="button"
              onClick={() => setCurrentView('admin')}
              className={`px-3 py-1 text-xs font-semibold rounded border transition-all cursor-pointer flex items-center gap-1 ${
                currentView === 'admin'
                  ? 'bg-amber-400 text-slate-950 border-amber-300 font-bold'
                  : 'bg-white/10 text-white hover:bg-white/20 border-white/30'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5 text-amber-200" />
              <span>Admin Portal</span>
            </button>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex items-center gap-2 xl:hidden">
            <button
              id="mobile-renew-quick-btn"
              type="button"
              onClick={() => setCurrentView('renew_flow')}
              className="px-3 py-1 bg-[#002B49] text-white text-xs font-bold rounded shadow-xs"
            >
              Renew Policy
            </button>
            <button
              id="mobile-menu-toggle"
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1.5 rounded text-white hover:bg-white/10 cursor-pointer"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div id="mobile-menu-drawer" className="xl:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-6 space-y-3 shadow-xl text-slate-900">
          <div className="grid grid-cols-2 gap-2 text-xs font-bold">
            {navLinks.map((link) => (
              <button
                key={link.key}
                type="button"
                onClick={() => handleNavClick(link.key)}
                className="text-left px-3 py-2 rounded bg-slate-50 hover:bg-orange-50 text-slate-800 hover:text-[#EA580C] flex items-center justify-between"
              >
                <span>{link.label}</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>
            ))}
          </div>

          <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
            <button
              id="mobile-become-advisor-btn"
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                if (onOpenAdvisor) onOpenAdvisor();
                else setCurrentView('advisor_login');
              }}
              className="w-full flex items-center justify-center gap-2 py-2 rounded bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-extrabold shadow-sm"
            >
              <span>Become an Advisor (Link Creation Desk)</span>
            </button>

            <button
              type="button"
              onClick={() => { setMobileMenuOpen(false); setCurrentView('soft_copy'); }}
              className="w-full flex items-center justify-center gap-2 py-2 rounded bg-orange-50 text-[#EA580C] text-xs font-bold border border-orange-200"
            >
              <FileText className="w-4 h-4" />
              <span>Download Policy Soft Copy</span>
            </button>

            <button
              type="button"
              onClick={() => { setMobileMenuOpen(false); setCurrentView('admin'); }}
              className="w-full flex items-center justify-center gap-2 py-2 rounded bg-[#002B49] text-white text-xs font-bold"
            >
              <LayoutDashboard className="w-4 h-4 text-amber-400" />
              <span>Admin / Agent Dashboard</span>
            </button>
          </div>
        </div>
      )}

    </header>
  );
};

