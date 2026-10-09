import React, { useState } from 'react';
import { Users, UserPlus, Shield, Heart, PlusCircle, X, Calendar, CheckCircle2, ChevronUp, ChevronDown } from 'lucide-react';
import { InsuredMember, CustomerPolicy } from '../types/insurance';

interface InsuredMembersSectionProps {
  policy: CustomerPolicy;
  onAddMember: (member: InsuredMember) => void;
  onRemoveMember?: (memberId: string) => void;
}

export const InsuredMembersSection: React.FC<InsuredMembersSectionProps> = ({
  policy,
  onAddMember,
  onRemoveMember
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<'adult' | 'child'>('adult');

  // Form State
  const [name, setName] = useState('');
  const [relation, setRelation] = useState<'Spouse' | 'Father' | 'Mother' | 'Son' | 'Daughter'>('Spouse');
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other'>('Male');
  const [dob, setDob] = useState('1992-05-15');
  const [condition, setCondition] = useState('');

  const openAddModal = (type: 'adult' | 'child') => {
    setModalType(type);
    if (type === 'adult') {
      setRelation('Spouse');
      setDob('1990-01-01');
    } else {
      setRelation('Son');
      setDob('2018-06-01');
    }
    setName('');
    setCondition('');
    setShowModal(true);
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Please enter member name');
      return;
    }

    const birthYear = new Date(dob).getFullYear();
    const age = Math.max(0, new Date().getFullYear() - birthYear);

    const newMem: InsuredMember = {
      id: `mem-new-${Date.now()}`,
      name: name.trim(),
      relation,
      gender,
      dob,
      age,
      coverageAmount: policy.totalSumInsured,
      preExistingConditions: condition.trim() ? [condition.trim()] : ['None']
    };

    onAddMember(newMem);
    setShowModal(false);
  };

  return (
    <div id="insured-members-section" className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4 font-sans">
      
      {/* Main Section Title */}
      <h3 className="text-lg font-extrabold text-slate-900 border-b border-slate-100 pb-3">
        Insured details
      </h3>

      {/* Accordion 1: INSURED MEMBERS */}
      <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
        
        {/* Accordion Header */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full bg-[#F8F9FA] hover:bg-slate-100/80 px-5 py-3.5 flex items-center justify-between text-left transition-colors cursor-pointer border-b border-slate-200"
        >
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">INSURED MEMBERS</div>
            <div className="text-sm font-bold text-slate-900 mt-0.5">{policy.customerName}</div>
          </div>
          {isOpen ? <ChevronUp className="w-5 h-5 text-slate-600" /> : <ChevronDown className="w-5 h-5 text-slate-600" />}
        </button>

        {/* Accordion Content */}
        {isOpen && (
          <div className="p-5 space-y-6 bg-white">
            
            {/* Add Adult / Add child prompt row */}
            <div className="flex items-center gap-2 text-xs pb-3 border-b border-slate-200 flex-wrap">
              <span className="text-slate-700 font-medium">Do you want to add more member in this policy?</span>
              <button
                type="button"
                onClick={() => openAddModal('adult')}
                className="text-[#EA580C] font-bold underline hover:text-[#c94900] cursor-pointer"
              >
                Add Adult
              </button>
              <span className="text-slate-400">or</span>
              <button
                type="button"
                onClick={() => openAddModal('child')}
                className="text-[#EA580C] font-bold underline hover:text-[#c94900] cursor-pointer"
              >
                Add child
              </button>
            </div>

            {/* Members Stacked 3-Column Rows */}
            <div className="divide-y divide-slate-200">
              {policy.members.map((member, idx) => {
                const isAdult = member.age >= 18 || member.relation === 'Self' || member.relation === 'Spouse';
                const label = isAdult 
                  ? (idx === 0 ? 'Adult 1' : `Adult ${idx + 1}`) 
                  : `Kid ${idx - 1 > 0 ? idx - 1 : 1}`;

                return (
                  <div key={member.id} className={`${idx > 0 ? 'pt-6' : ''} pb-6 space-y-4 text-xs font-sans`}>
                    
                    {/* Header: Adult 1 / Kid 1 on left, Remove on right */}
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-slate-900">{label}</span>
                      {policy.members.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`Are you sure you want to remove member ${member.name} from policy?`)) {
                              if (onRemoveMember) onRemoveMember(member.id);
                            }
                          }}
                          className="text-xs font-bold text-[#EA580C] underline hover:text-[#c94900] cursor-pointer"
                        >
                          Remove
                        </button>
                      )}
                    </div>

                    {/* Member Details 3-Column Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-y-4 gap-x-6 text-xs">
                      
                      {/* Row 1, Col 1: Name */}
                      <div>
                        <span className="text-slate-500 font-normal block text-xs mb-0.5">Name</span>
                        <strong className="text-slate-900 font-medium text-xs block">{member.name}</strong>
                      </div>

                      {/* Row 1, Col 2: Gender */}
                      <div>
                        <span className="text-slate-500 font-normal block text-xs mb-0.5">Gender</span>
                        <div className="flex items-center gap-2">
                          <strong className="text-slate-900 font-medium text-xs uppercase">{member.gender}</strong>
                          <button
                            type="button"
                            onClick={() => alert(`Edit gender for ${member.name}`)}
                            className="text-xs font-bold text-[#EA580C] underline cursor-pointer"
                          >
                            Edit
                          </button>
                        </div>
                      </div>

                      {/* Row 1, Col 3: DOB */}
                      <div>
                        <span className="text-slate-500 font-normal block text-xs mb-0.5">Date of birth</span>
                        <strong className="text-slate-900 font-medium text-xs">{member.dob}</strong>
                      </div>

                      {/* Row 2, Col 1: Relationship */}
                      <div>
                        <span className="text-slate-500 font-normal block text-xs mb-0.5">Relationship with applicant</span>
                        <strong className="text-slate-900 font-medium text-xs uppercase">{member.relation}</strong>
                      </div>

                      {/* Row 2, Col 2: Pre-existing disease */}
                      <div>
                        <span className="text-slate-500 font-normal block text-xs mb-0.5">Pre-existing disease</span>
                        <strong className="text-slate-900 font-medium text-xs">
                          {member.preExistingConditions && member.preExistingConditions.filter(c => c !== 'None').length > 0 
                            ? member.preExistingConditions.join(', ') 
                            : 'no'}
                        </strong>
                      </div>

                      {/* Row 2, Col 3: Height (Adults only) OR ABHA number (Kids) */}
                      {isAdult ? (
                        <div>
                          <span className="text-slate-500 font-normal block text-xs mb-0.5">Height (Ft’ & In’’)</span>
                          <strong className="text-slate-900 font-medium text-xs">{member.heightFtIn || "0’0’’"}</strong>
                        </div>
                      ) : (
                        <div>
                          <span className="text-slate-500 font-normal block text-xs mb-0.5">ABHA number</span>
                          <div className="flex items-center gap-1.5">
                            <strong className="text-slate-900 font-medium text-xs">{member.abhaNumber || 'NA'}</strong>
                            <button
                              type="button"
                              onClick={() => alert(`Add ABHA ID for ${member.name}`)}
                              className="text-xs font-bold text-[#EA580C] underline cursor-pointer"
                            >
                              Add ID
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Row 3 (Adults only): Weight & ABHA number */}
                      {isAdult && (
                        <>
                          <div>
                            <span className="text-slate-500 font-normal block text-xs mb-0.5">Weight (Kgs)</span>
                            <strong className="text-slate-900 font-medium text-xs">{member.weightKg || (idx === 0 ? "80" : "75")}</strong>
                          </div>

                          <div>
                            <span className="text-slate-500 font-normal block text-xs mb-0.5">ABHA number</span>
                            <div className="flex items-center gap-1.5">
                              <strong className="text-slate-900 font-medium text-xs">{member.abhaNumber || 'NA'}</strong>
                              <button
                                type="button"
                                onClick={() => alert(`Add ABHA ID for ${member.name}`)}
                                className="text-xs font-bold text-[#EA580C] underline cursor-pointer"
                              >
                                Add ID
                              </button>
                            </div>
                          </div>

                          <div></div>
                        </>
                      )}

                    </div>

                  </div>
                );
              })}
            </div>

          </div>
        )}
      </div>

      {/* Add Member Modal Dialog */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-scaleUp">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-[#EA580C]" />
                <h3 className="font-bold text-slate-900 text-lg">
                  Add {modalType === 'adult' ? 'Adult Member' : 'Child Member'}
                </h3>
              </div>
              <button 
                type="button" 
                onClick={() => setShowModal(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-4 text-xs font-medium">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Full Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Anjali Sharma"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-[#EA580C] outline-none text-sm text-slate-900"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Relationship *</label>
                  <select
                    value={relation}
                    onChange={(e) => setRelation(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-[#EA580C] outline-none text-sm text-slate-900"
                  >
                    {modalType === 'adult' ? (
                      <>
                        <option value="Spouse">Spouse</option>
                        <option value="Father">Father</option>
                        <option value="Mother">Mother</option>
                        <option value="Father-in-Law">Father-in-Law</option>
                        <option value="Mother-in-Law">Mother-in-Law</option>
                      </>
                    ) : (
                      <>
                        <option value="Son">Son</option>
                        <option value="Daughter">Daughter</option>
                      </>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Gender *</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-[#EA580C] outline-none text-sm text-slate-900"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Date of Birth *</label>
                  <input
                    type="date"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-[#EA580C] outline-none text-sm text-slate-900"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Pre-existing Condition</label>
                  <input
                    type="text"
                    value={condition}
                    onChange={(e) => setCondition(e.target.value)}
                    placeholder="e.g. Diabetes, None"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-[#EA580C] outline-none text-sm text-slate-900"
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg text-slate-600 text-[11px] leading-snug border border-slate-200">
                Newly added members are included in the floater sum insured (₹{policy.totalSumInsured.toLocaleString('en-IN')}) upon policy renewal completion.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-lg text-slate-600 hover:bg-slate-100 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-[#EA580C] hover:bg-[#D97706] text-white font-bold cursor-pointer"
                >
                  Save Member
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
};
