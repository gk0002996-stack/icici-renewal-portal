import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, CheckCircle2 } from 'lucide-react';
import { CustomerKYC, CustomerPolicy } from '../types/insurance';

interface KYCDetailsSectionProps {
  policy: CustomerPolicy;
  onUpdateKYC: (kyc: CustomerKYC) => void;
}

export const KYCDetailsSection: React.FC<KYCDetailsSectionProps> = ({
  policy,
  onUpdateKYC
}) => {
  const [isApplicantOpen, setIsApplicantOpen] = useState(true);
  const [isNomineeOpen, setIsNomineeOpen] = useState(true);
  const [pepStatus, setPepStatus] = useState<'Yes' | 'No'>('No');

  // Inline editing state
  const [isEditingApplicant, setIsEditingApplicant] = useState(false);
  const [isEditingNominee, setIsEditingNominee] = useState(false);

  const [applicantForm, setApplicantForm] = useState({
    applicantName: policy.kyc.applicantName || '',
    dob: policy.kyc.dob || '',
    email: policy.kyc.email || '',
    mobile: policy.kyc.mobile || '',
    landline: policy.kyc.landline || '',
    address: policy.kyc.address || '',
    addressLine2: policy.kyc.addressLine2 || '',
    landmark: policy.kyc.landmark || '',
    pincode: policy.kyc.pincode || '',
    city: policy.kyc.city || '',
    state: policy.kyc.state || ''
  });

  const [nomineeForm, setNomineeForm] = useState({
    nomineeName: policy.kyc.nomineeName || '',
    nomineeRelation: policy.kyc.nomineeRelation || 'Spouse',
    nomineeDob: policy.kyc.nomineeDob || '01/06/1987'
  });

  // Sync state whenever policy.kyc changes
  useEffect(() => {
    if (policy && policy.kyc) {
      setApplicantForm({
        applicantName: policy.kyc.applicantName || '',
        dob: policy.kyc.dob || '',
        email: policy.kyc.email || '',
        mobile: policy.kyc.mobile || '',
        landline: policy.kyc.landline || '',
        address: policy.kyc.address || '',
        addressLine2: policy.kyc.addressLine2 || '',
        landmark: policy.kyc.landmark || '',
        pincode: policy.kyc.pincode || '',
        city: policy.kyc.city || '',
        state: policy.kyc.state || ''
      });
      setNomineeForm({
        nomineeName: policy.kyc.nomineeName || '',
        nomineeRelation: policy.kyc.nomineeRelation || 'Spouse',
        nomineeDob: policy.kyc.nomineeDob || '01/06/1987'
      });
      if (policy.kyc.pepStatus === 'Yes' || policy.kyc.pepStatus === 'No') {
        setPepStatus(policy.kyc.pepStatus);
      }
    }
  }, [policy]);

  // Debounced auto-save of keyed contact & nominee details
  useEffect(() => {
    if (!isEditingApplicant && !isEditingNominee) return;
    const timer = setTimeout(() => {
      if (applicantForm.applicantName || applicantForm.email || applicantForm.mobile) {
        onUpdateKYC({
          ...policy.kyc,
          applicantName: applicantForm.applicantName || policy.kyc.applicantName,
          dob: applicantForm.dob || policy.kyc.dob,
          email: applicantForm.email || policy.kyc.email,
          mobile: applicantForm.mobile || policy.kyc.mobile,
          landline: applicantForm.landline || '-',
          address: applicantForm.address || policy.kyc.address,
          addressLine2: applicantForm.addressLine2 || policy.kyc.addressLine2,
          landmark: applicantForm.landmark || policy.kyc.landmark,
          pincode: applicantForm.pincode || policy.kyc.pincode,
          city: applicantForm.city || policy.kyc.city,
          state: applicantForm.state || policy.kyc.state,
          pepStatus: pepStatus,
          nomineeName: nomineeForm.nomineeName || policy.kyc.nomineeName,
          nomineeRelation: nomineeForm.nomineeRelation || policy.kyc.nomineeRelation,
          nomineeDob: nomineeForm.nomineeDob || policy.kyc.nomineeDob
        });
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [applicantForm, nomineeForm, pepStatus, isEditingApplicant, isEditingNominee]);

  const handleSaveApplicant = () => {
    onUpdateKYC({
      ...policy.kyc,
      applicantName: applicantForm.applicantName,
      dob: applicantForm.dob,
      email: applicantForm.email,
      mobile: applicantForm.mobile,
      landline: applicantForm.landline || '-',
      address: applicantForm.address,
      addressLine2: applicantForm.addressLine2,
      landmark: applicantForm.landmark,
      pincode: applicantForm.pincode,
      city: applicantForm.city,
      state: applicantForm.state,
      pepStatus: pepStatus
    });
    setIsEditingApplicant(false);
  };

  const handleSaveNominee = () => {
    onUpdateKYC({
      ...policy.kyc,
      nomineeName: nomineeForm.nomineeName,
      nomineeRelation: nomineeForm.nomineeRelation,
      nomineeDob: nomineeForm.nomineeDob
    });
    setIsEditingNominee(false);
  };

  return (
    <div id="kyc-details-section" className="space-y-4 font-sans">
      
      {/* Accordion 2: APPLICANT */}
      <div className="border border-slate-200 bg-white rounded-xl overflow-hidden shadow-xs">
        
        {/* Accordion Header */}
        <button
          type="button"
          onClick={() => setIsApplicantOpen(!isApplicantOpen)}
          className="w-full bg-[#F8F9FA] hover:bg-slate-100/80 px-5 py-3.5 flex items-center justify-between text-left transition-colors cursor-pointer border-b border-slate-200"
        >
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">APPLICANT</div>
            <div className="text-sm font-bold text-slate-900 mt-0.5">{policy.kyc.applicantName}</div>
          </div>
          {isApplicantOpen ? <ChevronUp className="w-5 h-5 text-slate-600" /> : <ChevronDown className="w-5 h-5 text-slate-600" />}
        </button>

        {/* Accordion Content */}
        {isApplicantOpen && (
          <div className="p-5 space-y-4 bg-white">
            
            {/* Green KYC Success Bar */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-emerald-800 font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>You KYC verification successfully done</span>
              </div>
              <button
                type="button"
                onClick={() => alert('Re-verifying CKYC/Aadhaar DigiLocker...')}
                className="text-[#EA580C] font-bold underline hover:text-[#c94900] cursor-pointer"
              >
                Re-verify
              </button>
            </div>

            {/* Edit top-right button */}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setIsEditingApplicant(!isEditingApplicant)}
                className="text-xs font-bold text-[#EA580C] underline hover:text-[#c94900] cursor-pointer"
              >
                {isEditingApplicant ? 'Cancel Editing' : 'Edit'}
              </button>
            </div>

            {isEditingApplicant ? (
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-300 space-y-4 text-xs font-medium">
                <div className="font-extrabold text-slate-800 text-xs border-b pb-2">Edit Applicant & Contact Details</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Full Name *</label>
                    <input
                      type="text"
                      value={applicantForm.applicantName}
                      onChange={(e) => setApplicantForm({ ...applicantForm, applicantName: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 font-bold text-slate-900 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Mobile Number *</label>
                    <input
                      type="text"
                      value={applicantForm.mobile}
                      onChange={(e) => setApplicantForm({ ...applicantForm, mobile: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 font-bold text-slate-900 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Email Address *</label>
                    <input
                      type="email"
                      value={applicantForm.email}
                      onChange={(e) => setApplicantForm({ ...applicantForm, email: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 font-bold text-slate-900 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Date of Birth *</label>
                    <input
                      type="text"
                      value={applicantForm.dob}
                      onChange={(e) => setApplicantForm({ ...applicantForm, dob: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 font-bold text-slate-900 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Landline Number</label>
                    <input
                      type="text"
                      value={applicantForm.landline}
                      onChange={(e) => setApplicantForm({ ...applicantForm, landline: e.target.value })}
                      placeholder="e.g. 011-23456789 or -"
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 font-bold text-slate-900 bg-white"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-slate-700 font-bold mb-1">Address Line 1 (House No / Building / Street) *</label>
                    <input
                      type="text"
                      value={applicantForm.address}
                      onChange={(e) => setApplicantForm({ ...applicantForm, address: e.target.value })}
                      placeholder="e.g. Flat 101, Sunshine Heights"
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 font-bold text-slate-900 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Address Line 2 (Area / Sector)</label>
                    <input
                      type="text"
                      value={applicantForm.addressLine2}
                      onChange={(e) => setApplicantForm({ ...applicantForm, addressLine2: e.target.value })}
                      placeholder="e.g. Sector 14, Dwarka"
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 font-bold text-slate-900 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Landmark</label>
                    <input
                      type="text"
                      value={applicantForm.landmark}
                      onChange={(e) => setApplicantForm({ ...applicantForm, landmark: e.target.value })}
                      placeholder="e.g. Near Metro Station"
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 font-bold text-slate-900 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Pincode *</label>
                    <input
                      type="text"
                      value={applicantForm.pincode}
                      onChange={(e) => setApplicantForm({ ...applicantForm, pincode: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 font-bold text-slate-900 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">City *</label>
                    <input
                      type="text"
                      value={applicantForm.city}
                      onChange={(e) => setApplicantForm({ ...applicantForm, city: e.target.value })}
                      placeholder="e.g. New Delhi"
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 font-bold text-slate-900 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">State *</label>
                    <input
                      type="text"
                      value={applicantForm.state || ''}
                      onChange={(e) => setApplicantForm({ ...applicantForm, state: e.target.value })}
                      placeholder="e.g. Delhi"
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 font-bold text-slate-900 bg-white"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setIsEditingApplicant(false)}
                    className="px-4 py-1.5 rounded-lg border border-slate-300 text-slate-700 font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveApplicant}
                    className="px-5 py-1.5 rounded-lg bg-[#EA580C] hover:bg-[#d84d00] text-white font-extrabold shadow-xs"
                  >
                    Save Applicant Details
                  </button>
                </div>
              </div>
            ) : (
              /* Applicant Details Grid (3 columns) */
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-y-4 gap-x-6 text-xs border-b border-slate-200 pb-5">
                
                {/* Row 1 */}
                <div>
                  <span className="text-slate-500 font-normal block text-xs mb-0.5">Name</span>
                  <strong className="text-slate-900 font-medium text-xs block">{policy.kyc.applicantName}</strong>
                </div>

                <div>
                  <span className="text-slate-500 font-normal block text-xs mb-0.5">Date of birth</span>
                  <strong className="text-slate-900 font-medium text-xs block">{policy.kyc.dob}</strong>
                </div>

                <div>
                  <span className="text-slate-500 font-normal block text-xs mb-0.5">Email</span>
                  <strong className="text-slate-900 font-medium text-xs block break-all">{policy.kyc.email}</strong>
                </div>

                {/* Row 2 */}
                <div>
                  <span className="text-slate-500 font-normal block text-xs mb-0.5">Mobile number</span>
                  <strong className="text-slate-900 font-medium text-xs block">{policy.kyc.mobile}</strong>
                </div>

                <div>
                  <span className="text-slate-500 font-normal block text-xs mb-0.5">Landline number</span>
                  <strong className="text-slate-900 font-medium text-xs block">{policy.kyc.landline || '-'}</strong>
                </div>

                <div>
                  <span className="text-slate-500 font-normal block text-xs mb-0.5">Address line 1</span>
                  <strong className="text-slate-900 font-medium text-xs block leading-snug">{policy.kyc.address || '-'}</strong>
                </div>

                {/* Row 3 */}
                <div>
                  <span className="text-slate-500 font-normal block text-xs mb-0.5">Address line 2</span>
                  <strong className="text-slate-900 font-medium text-xs block">{policy.kyc.addressLine2 || '-'}</strong>
                </div>

                <div>
                  <span className="text-slate-500 font-normal block text-xs mb-0.5">Landmark</span>
                  <strong className="text-slate-900 font-medium text-xs block">{policy.kyc.landmark || '-'}</strong>
                </div>

                <div></div>

                {/* Row 4 */}
                <div>
                  <span className="text-slate-500 font-normal block text-xs mb-0.5">Pincode</span>
                  <strong className="text-slate-900 font-medium text-xs block">{policy.kyc.pincode || '-'}</strong>
                </div>

                <div>
                  <span className="text-slate-500 font-normal block text-xs mb-0.5">City & state</span>
                  <strong className="text-slate-900 font-medium text-xs block">
                    {policy.kyc.city || 'Delhi'}{policy.kyc.state ? ` / ${policy.kyc.state}` : ''}
                  </strong>
                </div>

                <div></div>
              </div>
            )}

            {/* PEP Question */}
            <div className="pt-2 text-xs space-y-2">
              <p className="text-slate-800 font-medium leading-relaxed">
                Are you or any of the proposed applicants a PEP* or Family member/ Close relatives/ Associates of PEPs? <span className="text-slate-400 cursor-pointer">ⓘ</span>
              </p>
              <div className="flex items-center gap-6">
                <label className="inline-flex items-center gap-2 cursor-pointer text-slate-800 font-medium">
                  <input
                    type="radio"
                    name="pepOption"
                    value="Yes"
                    checked={pepStatus === 'Yes'}
                    onChange={() => setPepStatus('Yes')}
                    className="accent-[#EA580C] w-4 h-4 cursor-pointer"
                  />
                  <span>Yes</span>
                </label>
                <label className="inline-flex items-center gap-2 cursor-pointer text-slate-800 font-medium">
                  <input
                    type="radio"
                    name="pepOption"
                    value="No"
                    checked={pepStatus === 'No'}
                    onChange={() => setPepStatus('No')}
                    className="accent-[#EA580C] w-4 h-4 cursor-pointer"
                  />
                  <span>No</span>
                </label>
              </div>
            </div>

          </div>
        )}
      </div>

      {/* Enter PAN Details Card (Required for payments > ₹1,00,000) */}
      <div className="border border-amber-200 bg-amber-50/40 rounded-xl p-5 space-y-3 shadow-2xs font-sans">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <span>Enter PAN details</span>
              <span className="text-[10px] font-bold bg-amber-200/80 text-amber-900 px-2 py-0.5 rounded-full uppercase tracking-wider">
                Mandatory for &gt; ₹1,00,000
              </span>
            </h4>
            <p className="text-xs text-slate-600 mt-0.5">
              PAN details is required as you are making a payment of more than ₹1,00,000 rupees.
            </p>
          </div>
          <span className="text-xs font-bold text-emerald-700 bg-emerald-100/80 border border-emerald-300 px-2.5 py-0.5 rounded-md flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Verified</span>
          </span>
        </div>

        <div className="bg-white p-3.5 rounded-lg border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-slate-500 font-medium text-xs block mb-0.5">PAN Card no.</span>
            <strong className="text-slate-900 font-mono text-sm tracking-wider uppercase">
              {policy.kyc.panOrAadhar || 'AISPR0267J'}
            </strong>
          </div>
          <button
            type="button"
            onClick={() => alert(`PAN Card ${policy.kyc.panOrAadhar || 'AISPR0267J'} is verified with NSDL database for ${policy.kyc.applicantName}.`)}
            className="text-xs font-bold text-[#EA580C] underline hover:text-[#c94900] cursor-pointer self-start sm:self-auto"
          >
            Modify PAN
          </button>
        </div>
      </div>

      {/* Accordion 3: NOMINEE */}
      <div className="border border-slate-200 bg-white rounded-xl overflow-hidden shadow-xs">
        
        {/* Accordion Header */}
        <button
          type="button"
          onClick={() => setIsNomineeOpen(!isNomineeOpen)}
          className="w-full bg-[#F8F9FA] hover:bg-slate-100/80 px-5 py-3.5 flex items-center justify-between text-left transition-colors cursor-pointer border-b border-slate-200"
        >
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">NOMINEE</div>
            <div className="text-sm font-bold text-slate-900 mt-0.5">{policy.kyc.nomineeName}</div>
          </div>
          {isNomineeOpen ? <ChevronUp className="w-5 h-5 text-slate-600" /> : <ChevronDown className="w-5 h-5 text-slate-600" />}
        </button>

        {/* Accordion Content */}
        {isNomineeOpen && (
          <div className="p-5 space-y-3 bg-white">
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setIsEditingNominee(!isEditingNominee)}
                className="text-xs font-bold text-[#EA580C] underline hover:text-[#c94900] cursor-pointer"
              >
                {isEditingNominee ? 'Cancel Editing' : 'Edit'}
              </button>
            </div>

            {isEditingNominee ? (
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-300 space-y-4 text-xs font-medium">
                <div className="font-extrabold text-slate-800 text-xs border-b pb-2">Edit Nominee Information</div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Nominee Name *</label>
                    <input
                      type="text"
                      value={nomineeForm.nomineeName}
                      onChange={(e) => setNomineeForm({ ...nomineeForm, nomineeName: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 font-bold text-slate-900 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Nominee Date of Birth *</label>
                    <input
                      type="text"
                      value={nomineeForm.nomineeDob}
                      onChange={(e) => setNomineeForm({ ...nomineeForm, nomineeDob: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 font-bold text-slate-900 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Relationship with Insured *</label>
                    <input
                      type="text"
                      value={nomineeForm.nomineeRelation}
                      onChange={(e) => setNomineeForm({ ...nomineeForm, nomineeRelation: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 font-bold text-slate-900 bg-white"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setIsEditingNominee(false)}
                    className="px-4 py-1.5 rounded-lg border border-slate-300 text-slate-700 font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveNominee}
                    className="px-5 py-1.5 rounded-lg bg-[#EA580C] hover:bg-[#d84d00] text-white font-extrabold shadow-xs"
                  >
                    Save Nominee Details
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <span className="text-slate-500 font-normal block text-xs mb-0.5">Name of nominee</span>
                  <strong className="text-slate-900 font-medium text-xs block">{policy.kyc.nomineeName}</strong>
                </div>

                <div>
                  <span className="text-slate-500 font-normal block text-xs mb-0.5">Nominee's date of birth</span>
                  <strong className="text-slate-900 font-medium text-xs block">{policy.kyc.nomineeDob || '01/06/1987'}</strong>
                </div>

                <div>
                  <span className="text-slate-500 font-normal block text-xs mb-0.5">Relationship with insured</span>
                  <strong className="text-slate-900 font-medium text-xs block uppercase">{policy.kyc.nomineeRelation}</strong>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
};

