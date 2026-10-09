import React, { useState } from 'react';
import { 
  ChevronDown, 
  ChevronUp, 
  Facebook, 
  Instagram, 
  Twitter, 
  Youtube, 
  Linkedin,
  ShieldCheck
} from 'lucide-react';

export const Footer: React.FC = () => {
  const [linksOpen, setLinksOpen] = useState(true);

  return (
    <footer className="bg-[#F5F5F5] text-slate-800 font-sans border-t border-slate-200 pt-10 pb-12 text-xs">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* Company Registration Address Bar */}
        <div className="space-y-1.5 text-slate-800 text-[13px]">
          <h4 className="font-bold text-slate-900 text-sm">
            ICICI Lombard General Insurance Company Limited,
          </h4>
          <p className="text-slate-600 leading-normal font-normal">
            ICICI Lombard House, 414, Veer Savarkar Marg, Near Siddhi Vinayak Temple, Prabhadevi, Mumbai - 400025.
          </p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-600 text-xs pt-0.5">
            <span><strong className="text-slate-800">Reg. No.</strong> 115</span>
            <span className="text-slate-300">|</span>
            <span><strong className="text-slate-800">Email:</strong> customersupport@icicilombard.com</span>
            <span className="text-slate-300">|</span>
            <span><strong className="text-slate-800">Fax no:</strong> 022 61961323</span>
            <span className="text-slate-300">|</span>
            <span><strong className="text-slate-800">Contact:</strong> 1800 2666 (Available 24 x 7)</span>
          </div>
        </div>

        {/* Social Icons & App Badges Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-2">
          
          {/* Social Links */}
          <div className="flex items-center space-x-3 text-slate-900">
            <a href="#facebook" onClick={(e) => e.preventDefault()} className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center hover:bg-[#EA580C] transition-colors">
              <Facebook className="w-4 h-4" />
            </a>
            <a href="#instagram" onClick={(e) => e.preventDefault()} className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center hover:bg-[#EA580C] transition-colors">
              <Instagram className="w-4 h-4" />
            </a>
            <a href="#twitter" onClick={(e) => e.preventDefault()} className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center hover:bg-[#EA580C] transition-colors">
              <Twitter className="w-4 h-4" />
            </a>
            <a href="#youtube" onClick={(e) => e.preventDefault()} className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center hover:bg-[#EA580C] transition-colors">
              <Youtube className="w-4 h-4" />
            </a>
            <a href="#linkedin" onClick={(e) => e.preventDefault()} className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center hover:bg-[#EA580C] transition-colors">
              <Linkedin className="w-4 h-4" />
            </a>
          </div>

          {/* IL TakeCare App Download Badges */}
          <div className="flex items-center gap-3">
            <span className="font-bold text-slate-900 text-sm">IL TakeCare App</span>
            <div className="flex items-center gap-2">
              {/* Google Play Mock Badge */}
              <button 
                type="button" 
                onClick={() => alert('Opening Google Play Store...')} 
                className="bg-black text-white px-2.5 py-1 rounded-md text-[10px] flex items-center gap-1.5 hover:bg-slate-800 cursor-pointer"
              >
                <div className="w-3.5 h-3.5 bg-gradient-to-tr from-emerald-400 via-yellow-400 to-rose-500 rounded-2xs" />
                <div className="text-left leading-tight">
                  <div className="text-[8px] text-slate-300">GET IT ON</div>
                  <div className="font-bold">Google Play</div>
                </div>
              </button>

              {/* App Store Mock Badge */}
              <button 
                type="button" 
                onClick={() => alert('Opening Apple App Store...')} 
                className="bg-black text-white px-2.5 py-1 rounded-md text-[10px] flex items-center gap-1.5 hover:bg-slate-800 cursor-pointer"
              >
                <div className="w-3.5 h-3.5 bg-white text-black font-bold flex items-center justify-center rounded-2xs text-[9px]"></div>
                <div className="text-left leading-tight">
                  <div className="text-[8px] text-slate-300">Download on the</div>
                  <div className="font-bold">App Store</div>
                </div>
              </button>
            </div>
          </div>

        </div>

        {/* Accordion Footer Navigation Card matching Image 3 */}
        <div className="bg-white rounded-2xl p-6 shadow-2xs border border-slate-200/80 relative">
          <button 
            type="button"
            onClick={() => setLinksOpen(!linksOpen)}
            className="absolute top-4 right-4 text-[#EA580C] hover:text-slate-900 p-1 cursor-pointer"
          >
            {linksOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>

          {linksOpen && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-6 pt-1 text-[11px] text-slate-600 leading-relaxed font-normal">
              
              {/* Products */}
              <div className="space-y-2">
                <h5 className="font-bold text-slate-900 text-xs">Products</h5>
                <ul className="space-y-1">
                  <li><a href="#motor" className="hover:text-[#EA580C]">Motor Insurance</a></li>
                  <li><a href="#car" className="hover:text-[#EA580C]">Car Insurance</a></li>
                  <li><a href="#bike" className="hover:text-[#EA580C]">Two Wheeler Insurance</a></li>
                  <li><a href="#health" className="hover:text-[#EA580C]">Health Insurance</a></li>
                  <li><a href="#travel" className="hover:text-[#EA580C]">Travel Insurance</a></li>
                  <li><a href="#nri" className="hover:text-[#EA580C]">NRI Insurance Services</a></li>
                  <li><a href="#business" className="hover:text-[#EA580C]">Business Insurance</a></li>
                  <li><a href="#crop" className="hover:text-[#EA580C]">Crop Insurance</a></li>
                  <li><a href="#cyber" className="hover:text-[#EA580C]">Cyber Insurance</a></li>
                  <li><a href="#griha" className="hover:text-[#EA580C]">ICICI Bharat Griha Raksha Policy</a></li>
                </ul>
              </div>

              {/* Services */}
              <div className="space-y-2">
                <h5 className="font-bold text-slate-900 text-xs">Services</h5>
                <ul className="space-y-1">
                  <li><a href="#support" className="hover:text-[#EA580C]">Customer Support</a></li>
                  <li><a href="#citizen" className="hover:text-[#EA580C]">Citizen Charter</a></li>
                  <li><a href="#quote" className="hover:text-[#EA580C]">Retrieve Quote</a></li>
                  <li><a href="#unclaimed" className="hover:text-[#EA580C]">Unclaimed Amount</a></li>
                  <li><a href="#intimate" className="hover:text-[#EA580C]">Intimate PA claim</a></li>
                  <li><a href="#renew" className="hover:text-[#EA580C]">Renew Your Policy</a></li>
                  <li><a href="#portability" className="hover:text-[#EA580C]">Portability</a></li>
                  <li><a href="#eia" className="hover:text-[#EA580C]">EIA</a></li>
                  <li><a href="#odr" className="hover:text-[#EA580C]">Online Dispute Resolution Portal for Investors</a></li>
                  <li><a href="#sme" className="hover:text-[#EA580C]">SME Endorsements</a></li>
                </ul>
              </div>

              {/* Legal */}
              <div className="space-y-2">
                <h5 className="font-bold text-slate-900 text-xs">Legal</h5>
                <ul className="space-y-1">
                  <li><a href="#privacy" className="hover:text-[#EA580C]">Privacy Policy</a></li>
                  <li><a href="#insure-app" className="hover:text-[#EA580C]">Insure App Privacy Policy</a></li>
                  <li><a href="#withdrawal" className="hover:text-[#EA580C]">Product Withdrawal</a></li>
                  <li><a href="#dnc" className="hover:text-[#EA580C]">Do Not Call Registry</a></li>
                  <li><a href="#tnc" className="hover:text-[#EA580C]">General Terms & Conditions</a></li>
                  <li><a href="#disclaimer" className="hover:text-[#EA580C]">Disclaimer</a></li>
                  <li><a href="#ombudsman" className="hover:text-[#EA580C]">Insurance Ombudsman</a></li>
                  <li><a href="#stewardship" className="hover:text-[#EA580C]">Stewardship Policy</a></li>
                  <li><a href="#disclosure" className="hover:text-[#EA580C]">Disclosure under Stewardship Policy</a></li>
                  <li><a href="#policyholder" className="hover:text-[#EA580C]">Policy for Policyholder's Interest Protection & Grievance Redressal</a></li>
                  <li><a href="#advisory" className="hover:text-[#EA580C]">Advisory to Customer and Channel Partners</a></li>
                  <li><a href="#product-list" className="hover:text-[#EA580C]">ICICI Lombard Product List</a></li>
                  <li><a href="#branches" className="hover:text-[#EA580C]">GRO Details of Active Branches</a></li>
                  <li><a href="#tp-claims" className="hover:text-[#EA580C]">Motor Third Party claims - Statewise nodal officer details</a></li>
                  <li><a href="#whistle" className="hover:text-[#EA580C]">Whistle Blower Policy</a></li>
                </ul>
              </div>

              {/* About Us */}
              <div className="space-y-2">
                <h5 className="font-bold text-slate-900 text-xs">About Us</h5>
                <ul className="space-y-1">
                  <li><a href="#overview" className="hover:text-[#EA580C]">Overview</a></li>
                  <li><a href="#promoters" className="hover:text-[#EA580C]">Promoters</a></li>
                  <li><a href="#csr" className="hover:text-[#EA580C]">CSR</a></li>
                  <li><a href="#risk" className="hover:text-[#EA580C]">Risk Management</a></li>
                  <li><a href="#disclosures" className="hover:text-[#EA580C]">Public Disclosures</a></li>
                  <li><a href="#awards" className="hover:text-[#EA580C]">Awards and Recognitions</a></li>
                  <li><a href="#investors" className="hover:text-[#EA580C]">Investor Relations</a></li>
                  <li><a href="#media" className="hover:text-[#EA580C]">Media</a></li>
                </ul>
              </div>

              {/* Others */}
              <div className="space-y-2">
                <h5 className="font-bold text-slate-900 text-xs">Others</h5>
                <ul className="space-y-1">
                  <li><a href="#agents" className="hover:text-[#EA580C]">Agents' Portal</a></li>
                  <li><a href="#corp" className="hover:text-[#EA580C]">Corporate Login</a></li>
                  <li><a href="#blacklisted" className="hover:text-[#EA580C]">Blacklisted Agents</a></li>
                  <li><a href="#bagi" className="hover:text-[#EA580C]">BAGI Blacklisted Agents</a></li>
                  <li><a href="#distribution" className="hover:text-[#EA580C]">Distribution Channels</a></li>
                  <li><a href="#pmsby" className="hover:text-[#EA580C]">Pradhan Mantri Suraksha Bima Yojna</a></li>
                  <li><a href="#empanelment" className="hover:text-[#EA580C]">Hospital Empanelment Criteria</a></li>
                  <li><a href="#account-agg" className="hover:text-[#EA580C]">Account Aggregator</a></li>
                  <li><a href="#iio" className="hover:text-[#EA580C]">International Business (IIO)</a></li>
                  <li><a href="#sitemap" className="hover:text-[#EA580C]">Sitemap</a></li>
                  <li><a href="#agent-sme" className="hover:text-[#EA580C]">Become an Agent (SME)</a></li>
                  <li><a href="#indicators" className="hover:text-[#EA580C]">Data on Health Claim Service Indicators</a></li>
                  <li><a href="#irdai-list" className="hover:text-[#EA580C]">IRDAI List of Blacklisted Agents</a></li>
                </ul>
              </div>

            </div>
          )}
        </div>

        {/* Additional Accordion Bar 1 matching Image 4 */}
        <div className="bg-white rounded-xl p-4 shadow-2xs border border-slate-200 flex flex-wrap items-center justify-between gap-4 text-xs font-semibold text-slate-800">
          <div className="flex flex-wrap items-center gap-x-8 gap-y-2">
            <span className="hover:text-[#EA580C] cursor-pointer">Info Center</span>
            <span className="hover:text-[#EA580C] cursor-pointer">Renewal</span>
            <span className="hover:text-[#EA580C] cursor-pointer">Claim</span>
            <span className="hover:text-[#EA580C] cursor-pointer">Help</span>
            <span className="hover:text-[#EA580C] cursor-pointer">Customer Reviews</span>
          </div>
          <ChevronDown className="w-4 h-4 text-[#EA580C]" />
        </div>

        {/* Additional Accordion Bar 2 matching Image 4 */}
        <div className="bg-white rounded-xl p-4 shadow-2xs border border-slate-200 flex flex-wrap items-center justify-between gap-4 text-xs font-semibold text-slate-800">
          <div className="flex flex-wrap items-center gap-x-8 gap-y-2">
            <span className="hover:text-[#EA580C] cursor-pointer">Car Insurance</span>
            <span className="hover:text-[#EA580C] cursor-pointer">Two Wheeler Insurance</span>
            <span className="hover:text-[#EA580C] cursor-pointer">Health Insurance</span>
            <span className="hover:text-[#EA580C] cursor-pointer">Travel Insurance</span>
            <span className="hover:text-[#EA580C] cursor-pointer">SME Insurance</span>
          </div>
          <ChevronDown className="w-4 h-4 text-[#EA580C]" />
        </div>

        {/* Legal Regulatory Disclaimers Paragraphs matching Image 4 */}
        <div className="space-y-3 text-[11px] text-slate-600 leading-relaxed pt-2 border-t border-slate-200">
          <p>
            ICICI Lombard General Insurance Company Ltd. is one of the leading private sector general insurance company in India offering insurance coverage for motor, health, travel, home, student travel and more. Policies can be purchased and renewed online as well. Immediate issuance of policy copy online.
          </p>
          <p>
            ICICI trade logo displayed above belongs to ICICI Bank and is used by ICICI Lombard GIC Ltd. under license and Lombard logo belongs to ICICI Lombard GIC Ltd. Insurance is the subject matter of the solicitation. The advertisement contains only an indication of cover offered. For more details on risk factors, terms, conditions and exclusions, please read the sales brochure carefully before concluding a sale. CIN: L67200MH2000PLC129408
          </p>
        </div>

        {/* Bottom Trust Badges & Group Companies Dropdown matching Image 4 */}
        <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          
          {/* Trust Badges */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-white border border-slate-300 text-[10px] font-bold text-slate-700 shadow-2xs">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>SECURED BY Entrust SSL</span>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-white border border-slate-300 text-[10px] font-bold text-slate-700 shadow-2xs">
              <div className="w-3.5 h-3.5 rounded-full bg-cyan-500 text-white font-black text-[8px] flex items-center justify-center">✓</div>
              <span>digicert SECURED</span>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-white border border-slate-300 text-[10px] font-bold text-[#C4121A] shadow-2xs">
              <span className="px-1 py-0.5 bg-[#C4121A] text-white text-[8px] font-extrabold rounded-2xs">BIMA</span>
              <span>BHAROSA Grievance Redressal</span>
            </div>
          </div>

          {/* Group Companies Dropdown */}
          <div className="relative">
            <select className="bg-white border border-slate-300 rounded px-4 py-1.5 text-xs font-semibold text-slate-700 outline-none cursor-pointer pr-8 appearance-none shadow-2xs">
              <option>Group Companies</option>
              <option>ICICI Bank</option>
              <option>ICICI Prudential Life Insurance</option>
              <option>ICICI Securities</option>
              <option>ICICI Prudential AMC</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

        </div>

      </div>
    </footer>
  );
};
