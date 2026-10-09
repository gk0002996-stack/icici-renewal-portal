import React from 'react';

export const ProductTableSection: React.FC = () => {
  const products = [
    { name: 'ICICI Lombard Complete Health Insurance', code: '4128', uin: 'ICIHLIP23144V072223' },
    { name: 'Befit Rider*', code: '4180', uin: 'ICIHLIP21569V012021' },
    { name: 'Health Booster', code: '4140', uin: 'ICIHLIP22100V032122' },
    { name: 'Personal Protect Policy', code: '4111', uin: 'ICIPAIP22076V042122' },
    { name: 'Arogya Sanjeevani Policy', code: '4171', uin: 'ICIHLIP20178V011920' },
    { name: 'Health AdvantEdge', code: '4193', uin: 'ICIHLIP23075V032223' },
    { name: 'Golden Shield', code: '4192', uin: 'ICIHLIP22012V012223' },
    { name: 'Saral Suraksha Bima, ICICI Lombard', code: '-', uin: 'ICIPAIP21626V012021' },
    { name: 'Elevate', code: '4225', uin: 'ICIHLIP25048V042425' },
  ];

  return (
    <section className="bg-white py-12 px-4 sm:px-6 lg:px-8 font-sans border-b border-slate-200">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Product Code & UIN Table */}
        <div className="overflow-hidden rounded-xl border border-slate-200 shadow-2xs">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#E5E3D5] text-slate-900 font-semibold border-b border-slate-300">
                <th className="py-3 px-6 w-1/2">Product</th>
                <th className="py-3 px-6 text-center w-1/4">Product Code</th>
                <th className="py-3 px-6 text-center w-1/4">UIN no.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 font-normal">
              {products.map((item, idx) => (
                <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                  <td className="py-3 px-6 font-medium text-slate-800">{item.name}</td>
                  <td className="py-3 px-6 text-center font-mono">{item.code}</td>
                  <td className="py-3 px-6 text-center font-mono text-slate-600">{item.uin}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Disclaimers paragraph matching Image 2 */}
        <div className="space-y-4 pt-2">
          <p className="text-xs text-slate-600 leading-relaxed font-light">
            Disclaimers: *The BeFit Rider can only be bought along with Health AdvantEdge (ICIHLIP23075V032223) or Health Booster (ICIHLIP22100V032122) or ICICI Lombard Arogya Sanjeevani (ICIHLIP20178V011920) Products and cannot be bought in isolation or as a separate product. For better health security, choose ICICI Lombard's <span className="font-bold text-slate-900">health insurance plans</span> to protect yourself and your loved ones.
          </p>

          <div className="pt-2">
            <button
              type="button"
              onClick={() => alert('ICICI Lombard Statutory & Regulatory Disclaimers')}
              className="text-xs font-semibold text-[#EA580C] underline hover:text-[#d84d00] cursor-pointer"
            >
              Disclaimers
            </button>
          </div>
        </div>

      </div>
    </section>
  );
};
