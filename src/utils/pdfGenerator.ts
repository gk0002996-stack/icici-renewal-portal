import { jsPDF } from 'jspdf';
import { CustomerPolicy, InsuredMember } from '../types/insurance';

// Helper to draw standard ICICI Lombard Header & Footer on any page
function drawICICIPageHeaderFooter(doc: jsPDF, pageNum: number, totalPages: number) {
  // Top Orange Accent Line
  doc.setFillColor(234, 88, 12); // ICICI Orange #EA580C
  doc.rect(0, 0, 210, 3, 'F');

  // Top Right Logo Representation
  doc.setTextColor(0, 43, 73); // ICICI Navy #002B49
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('ICICI Lombard', 150, 11);

  doc.setTextColor(234, 88, 12);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('Nibhaye Vaade', 150, 15);

  doc.setFillColor(234, 88, 12);
  doc.rect(150, 16.5, 45, 0.8, 'F');

  // Bottom Footer
  const footerY = 282;

  // Bottom Orange Line
  doc.setFillColor(234, 88, 12);
  doc.rect(0, footerY - 2, 210, 1.5, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(0, 43, 73);
  doc.text('ICICI Lombard General Insurance Company Limited', 14, footerY + 2);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(80, 80, 80);
  doc.text('IRDA Reg. No. 115 | CIN: L67200MH2000PLC129408 | ICICI Lombard Complete Health Insurance | UIN - ICIHLIP22096V062122', 14, footerY + 5);
  doc.text('Reg Office: ICICI Lombard House, 414, P Balu Marg, Off Veer Savarkar Road, Near Siddhi Vinayak Temple, Prabhadevi, Mumbai - 400025.', 14, footerY + 8);
  doc.text('Toll free: 1800 2666 | Email: customersupport@icicilombard.com | Website: www.icicilombard.com', 14, footerY + 11);

  // Page number
  doc.setFont('helvetica', 'bold');
  doc.text(`${pageNum} / ${totalPages}`, 192, footerY + 11);
}

export function generatePolicySchedulePDF(policy: CustomerPolicy, finalAmountPaid?: number, overrideTenure?: number) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const totalPages = 6;
  const primaryNavy = [0, 43, 73];
  const borderGray = [180, 180, 180];
  const tableHeaderBg = [240, 243, 246];

  // Helper for drawing bounded table cell
  const drawCell = (
    x: number, 
    y: number, 
    w: number, 
    h: number, 
    label: string, 
    val: string, 
    isHeader = false
  ) => {
    if (isHeader) {
      doc.setFillColor(tableHeaderBg[0], tableHeaderBg[1], tableHeaderBg[2]);
      doc.rect(x, y, w, h, 'F');
    }
    doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
    doc.setLineWidth(0.2);
    doc.rect(x, y, w, h, 'D');

    if (label) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(60, 60, 60);
      doc.text(label, x + 1.5, y + 3.5);
    }

    if (val) {
      doc.setFont('helvetica', isHeader ? 'bold' : 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(0, 0, 0);
      // Wrap text if needed
      const splitVal = doc.splitTextToSize(val, w - 3);
      doc.text(splitVal, x + 1.5, label ? y + 7 : y + 4.5);
    }
  };

  // ==========================================
  // PAGE 1: Policy Schedule (Policy Certificate)
  // ==========================================
  drawICICIPageHeaderFooter(doc, 1, totalPages);

  let y = 14;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(primaryNavy[0], primaryNavy[1], primaryNavy[2]);
  doc.text('(a) Policy Schedule (Policy Certificate)', 14, y);

  y += 4;

  // Proposer & Policy Grid Table (2 Columns)
  const colW1 = 91;
  const colW2 = 91;
  const rowH = 7.5;
  const startX1 = 14;
  const startX2 = 105;

  const isRenewed = policy.policyStatus === 'Renewed' || policy.renewalStatus === 'Renewed' || Boolean(policy.newPolicyEndDate);
  const effectiveTenure = overrideTenure || policy.selectedTenure || 1;

  let startDate = policy.policyStartDate || '2025-04-01';
  let validUntilDate = policy.newPolicyEndDate || policy.previousPolicyEndDate;

  if (isRenewed) {
    const basePrev = policy.previousPolicyEndDate || '2026-03-31';
    try {
      const pEnd = new Date(basePrev);
      const rStart = new Date(pEnd);
      rStart.setDate(rStart.getDate() + 1);
      startDate = rStart.toISOString().split('T')[0];

      const rEnd = new Date(pEnd);
      rEnd.setFullYear(rEnd.getFullYear() + effectiveTenure);
      validUntilDate = rEnd.toISOString().split('T')[0];
    } catch {
      validUntilDate = policy.newPolicyEndDate || policy.previousPolicyEndDate;
    }
  } else {
    try {
      const pStart = new Date(policy.policyStartDate || '2025-04-01');
      const pEnd = new Date(pStart);
      pEnd.setFullYear(pEnd.getFullYear() + effectiveTenure);
      pEnd.setDate(pEnd.getDate() - 1);
      validUntilDate = pEnd.toISOString().split('T')[0];
    } catch {
      validUntilDate = policy.newPolicyEndDate || policy.previousPolicyEndDate;
    }
  }

  // Calculate pricing for chosen tenure
  let calcPaid = finalAmountPaid;
  if (!calcPaid) {
    if (policy.tenurePrices && policy.tenurePrices[effectiveTenure as 1 | 2 | 3]) {
      calcPaid = policy.tenurePrices[effectiveTenure as 1 | 2 | 3];
    } else {
      const discountPct = effectiveTenure === 1 ? (policy.loyaltyNcbDiscountPct || 10) : effectiveTenure === 2 ? 25 : 35;
      const mult = effectiveTenure === 1 ? 1 : effectiveTenure === 2 ? 1.9 : 2.75;
      const gross = Math.round(policy.baseAnnualPremium * mult * 1.18);
      calcPaid = Math.round(gross * (1 - discountPct / 100));
    }
  }

  const gstVal = Math.round((calcPaid / 1.18) * 0.18);
  const basicVal = Math.round(calcPaid - gstVal);
  const cgstVal = (gstVal / 2).toFixed(2);
  const sgstVal = (gstVal / 2).toFixed(2);

  // Row 1
  drawCell(startX1, y, colW1, rowH, 'Proposer Name', policy.customerName);
  drawCell(startX2, y, colW2, rowH, 'Product name', 'ICICI Lombard Complete Health Insurance');
  y += rowH;

  // Row 2
  const addressParts = [
    policy.kyc?.address,
    policy.kyc?.addressLine2,
    policy.kyc?.landmark ? `Near ${policy.kyc.landmark}` : '',
    policy.kyc?.city,
    policy.kyc?.state
  ].filter(Boolean);
  const addrStr = `${addressParts.join(', ')}${policy.kyc?.pincode ? ` - ${policy.kyc.pincode}` : ''}` || 'NEW DELHI, DELHI - 110001';
  drawCell(startX1, y, colW1, rowH * 1.5, 'Address', addrStr);
  drawCell(startX2, y, colW2, rowH * 0.75, 'Plan Name', policy.policyName);
  drawCell(startX2, y + rowH * 0.75, colW2, rowH * 0.75, 'Policy No.', `${policy.policyNumber}/04/000`);
  y += rowH * 1.5;

  // Row 3
  drawCell(startX1, y, colW1, rowH, 'Contact No.', `98******${policy.mobileNumber.slice(-2)}`);
  drawCell(startX2, y, colW2, rowH, 'Period of Insurance', `From 00:00 hrs ${startDate} To 23:59 hrs ${validUntilDate}`);
  y += rowH;

  // Row 4
  drawCell(startX1, y, colW1, rowH, 'Email Address', policy.email.toUpperCase());
  drawCell(startX2, y, colW2, rowH, 'Policy Tenure', `${effectiveTenure} Year(s)`);
  y += rowH;

  // Row 5
  const nominee = policy.members.find(m => m.relation !== 'Self')?.name || 'FAMILY NOMINEE';
  drawCell(startX1, y, colW1, rowH, 'Nominee Name', nominee.toUpperCase());
  drawCell(startX2, y, colW2, rowH, 'Alternate Policy No.', `${policy.policyNumber}/03/000`);
  y += rowH;

  // Row 6
  drawCell(startX1, y, colW1, rowH, 'Relationship With Policyholder', 'SPOUSE / FAMILY');
  drawCell(startX2, y, colW2, rowH, 'LAN No.', 'NA');
  y += rowH;

  // Row 7
  drawCell(startX1, y, colW1, rowH, 'Appointee Name', 'NA');
  drawCell(startX2, y, colW2, rowH, 'Policy Issuing Office', 'Prabhadevi, Mumbai');
  y += rowH;

  // Row 8
  drawCell(startX1, y, colW1, rowH, 'Nominee Age / GSTIN', 'NA');
  drawCell(startX2, y, colW2, rowH, 'Policy Issued On / Invoice No.', `${policy.policyStartDate} / INV-${policy.policyNumber.replace(/[^0-9]/g, '')}`);
  y += rowH;

  // Row 9
  drawCell(startX1, y, colW1, rowH * 1.2, 'Servicing Branch Address', 'Unit No.684-690, Seethakathi Centre, Chennai - 600006');
  drawCell(startX2, y, colW2, rowH * 1.2, 'Servicing Branch Name', 'Chennai Main Branch');
  y += rowH * 1.2;

  // PEP Row
  drawCell(startX1, y, colW1 + colW2, 5, 'Politically Exposed Person (PEP)/close relative of PEP:', 'No');
  y += 7;

  // Insured Members Table Section
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('Insured Member(s) Details', startX1, y);
  y += 2.5;

  const memCols = [
    { name: "Insured Name", w: 34 },
    { name: "DOB", w: 18 },
    { name: "Age", w: 10 },
    { name: "Joining Date", w: 18 },
    { name: "Gender", w: 12 },
    { name: "Relation", w: 14 },
    { name: "Sum Insured (Rs.)", w: 22 },
    { name: "Pre-existing", w: 18 },
    { name: "Optional Cover", w: 18 },
    { name: "ABHA No", w: 18 }
  ];

  let curX = startX1;
  memCols.forEach(c => {
    drawCell(curX, y, c.w, 6, '', c.name, true);
    curX += c.w;
  });
  y += 6;

  policy.members.forEach(m => {
    curX = startX1;
    const vals = [
      m.name.toUpperCase(),
      m.dob,
      `${m.age} Y`,
      policy.policyStartDate,
      m.gender,
      m.relation.toUpperCase(),
      policy.totalSumInsured.toLocaleString('en-IN'),
      'None',
      'None',
      'None'
    ];
    vals.forEach((v, i) => {
      drawCell(curX, y, memCols[i].w, 6, '', v, false);
      curX += memCols[i].w;
    });
    y += 6;
  });

  y += 3;

  // Plan Details Block
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('Plan Details & Tax Classification', startX1, y);
  y += 2.5;

  drawCell(startX1, y, 35, 6, '', 'Plan Name', true);
  drawCell(startX1 + 35, y, 30, 6, '', 'Loyalty Bonus (Rs.)', true);
  drawCell(startX1 + 65, y, 20, 6, '', 'Sub-limit', true);
  drawCell(startX1 + 85, y, 25, 6, '', 'Deductible (Rs.)', true);
  drawCell(startX1 + 110, y, 36, 6, '', 'GSTIN Reg. No', true);
  drawCell(startX1 + 146, y, 36, 6, '', 'HSN/SAC code', true);
  y += 6;

  drawCell(startX1, y, 35, 6, '', policy.policyName, false);
  drawCell(startX1 + 35, y, 30, 6, '', policy.loyaltyBonus.toLocaleString('en-IN'), false);
  drawCell(startX1 + 65, y, 20, 6, '', 'B', false);
  drawCell(startX1 + 85, y, 25, 6, '', '0', false);
  drawCell(startX1 + 110, y, 36, 6, '', '33AAACI7904G2ZT', false);
  drawCell(startX1 + 146, y, 36, 6, '', '997133 GENERAL SERVICES', false);
  y += 9;

  // Premium Details Table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('Premium Details (Rs.)', startX1, y);
  y += 2.5;

  const premW = 182 / 5;
  drawCell(startX1, y, premW, 6, '', 'Basic Premium', true);
  drawCell(startX1 + premW, y, premW, 6, '', 'CGST (9%)', true);
  drawCell(startX1 + premW * 2, y, premW, 6, '', 'SGST (9%)', true);
  drawCell(startX1 + premW * 3, y, premW, 6, '', 'Total Tax Payable', true);
  drawCell(startX1 + premW * 4, y, premW, 6, '', 'Total Premium Paid', true);
  y += 6;

  drawCell(startX1, y, premW, 6, '', `Rs. ${basicVal.toLocaleString('en-IN')}`, false);
  drawCell(startX1 + premW, y, premW, 6, '', `Rs. ${cgstVal}`, false);
  drawCell(startX1 + premW * 2, y, premW, 6, '', `Rs. ${sgstVal}`, false);
  drawCell(startX1 + premW * 3, y, premW, 6, '', `Rs. ${gstVal.toLocaleString('en-IN')}`, false);
  drawCell(startX1 + premW * 4, y, premW, 6, '', `Rs. ${Math.round(calcPaid).toLocaleString('en-IN')}`, false);
  y += 9;

  // Agent Details Table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('Agent Details', startX1, y);
  y += 2.5;

  drawCell(startX1, y, 60, 6, '', 'Agent Name: ICICI BANK LIMITED', false);
  drawCell(startX1 + 60, y, 60, 6, '', 'Agent Code: CA0112', false);
  drawCell(startX1 + 120, y, 62, 6, '', 'Agent Contact No.: 18002666', false);
  y += 9;

  // Digital Signature Block
  doc.setDrawColor(primaryNavy[0], primaryNavy[1], primaryNavy[2]);
  doc.setLineWidth(0.3);
  doc.rect(startX1 + 115, y, 67, 18);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(21, 128, 61);
  doc.text('Signature Not Verified', startX1 + 118, y + 4);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.5);
  doc.setTextColor(50, 50, 50);
  doc.text('Digitally Signed by DS ICICI LOMBARD', startX1 + 118, y + 8);
  doc.text('GENERAL INSURANCE CO LTD 1', startX1 + 118, y + 11);
  doc.text(`Date: ${new Date().toISOString().slice(0, 10)} 14:54:57 IST`, startX1 + 118, y + 14);

  // ==========================================
  // PAGE 2: Important Terms & Policy Wordings Notice
  // ==========================================
  doc.addPage();
  drawICICIPageHeaderFooter(doc, 2, totalPages);

  y = 20;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(primaryNavy[0], primaryNavy[1], primaryNavy[2]);
  doc.text('Important Policy Terms & Conditions', 14, y);

  y += 6;
  doc.setFillColor(250, 250, 250);
  doc.rect(14, y, 182, 38, 'F');
  doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
  doc.rect(14, y, 182, 38, 'D');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(40, 40, 40);

  const termText = `Important: Insurance benefit shall become voidable at the option of the company, in the event of any untrue or incorrect statement, misrepresentation, non-description of any material particular in the proposal form/ personal statement, declaration and connected documents, or any material information has been withheld by beneficiary or anyone acting on beneficiary's behalf to obtain insurance benefit. Please note that any claims arising out of pre-existing illness/ injury/ symptoms is excluded from the scope of this policy subject to applicable terms and conditions. Refer to policy wordings for the terms and conditions. All disputes are subject to the jurisdiction of Mumbai High Court only. For claims, please call us at our toll free no. 1800 2666 or e-mail to us at ihealthcare@icicilombard.com or write to us at ICICI Lombard GIC, 1st, 4th (Half), 5th and 6th floors, Varun Towers- II, Opp. Hyderabad Public school, Begumpet, Hyderabad District Hyderabad, Pin code - 500016 Telangana.`;

  const splitTerms = doc.splitTextToSize(termText, 176);
  doc.text(splitTerms, 17, y + 5);

  y += 45;
  doc.setFillColor(255, 255, 255);
  doc.rect(14, y, 182, 35, 'D');

  const policyIssuedText = `This policy has been issued based on the details furnished by the policyholder. Please review the details furnished in the policy certificate and confirm that same are in order. In case of any discrepancy/ variation, you are requested to call us immediately at our toll free no. 1800 2666 or write to us at customersupport@icicilombard.com. In the absence of any communication from you within the period of 15 days of receipt of this document, the policy would be deemed to be in order and issued as per your proposal. All refunds and claim payment will be done through NEFT only. In case of addition of member/ increase in sum insured, fresh waiting period will be applicable to new member/ increased sum insured.`;

  const splitPolicyIssued = doc.splitTextToSize(policyIssuedText, 176);
  doc.text(splitPolicyIssued, 17, y + 5);

  y += 42;
  // QR Code Box
  doc.setDrawColor(0, 43, 73);
  doc.rect(14, y, 20, 20);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6);
  doc.text('QR CODE', 17, y + 11);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('Click or Scan QR Code for Policy Wordings & Network Hospital List', 38, y + 11);

  // ==========================================
  // PAGE 3: Tax Certificate (Section 80D Certificate)
  // ==========================================
  doc.addPage();
  drawICICIPageHeaderFooter(doc, 3, totalPages);

  y = 20;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(primaryNavy[0], primaryNavy[1], primaryNavy[2]);
  doc.text('Tax Certificate', 14, y);

  y += 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(0, 0, 0);
  doc.text('To', 14, y);
  y += 4;
  doc.text(policy.customerName.toUpperCase(), 14, y);
  y += 4;
  doc.setFont('helvetica', 'normal');
  doc.text(addrStr, 14, y);

  y += 10;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('Subject: Premium certificate for the purpose of deduction under section 80D of Income Tax Act, 1961 and any amendments made thereafter.', 14, y);

  y += 8;
  doc.setFont('helvetica', 'normal');
  doc.text(`Dear ${policy.customerName.toUpperCase()},`, 14, y);

  y += 6;
  doc.text(`This is to certify that the Company has received the premium dated ${policy.policyStartDate} for Health insurance coverage under "Health Insurance Policy" with the following details.`, 14, y);

  y += 8;
  // Tax Grid Table
  drawCell(startX1, y, 45, 6, '', "Policyholder's Name", true);
  drawCell(startX1 + 45, y, 46, 6, '', policy.customerName.toUpperCase(), false);
  drawCell(startX1 + 91, y, 45, 6, '', "Policy Number", true);
  drawCell(startX1 + 136, y, 46, 6, '', `${policy.policyNumber}/04/000`, false);
  y += 6;

  drawCell(startX1, y, 45, 6, '', "Policy Start Date", true);
  drawCell(startX1 + 45, y, 46, 6, '', policy.policyStartDate, false);
  drawCell(startX1 + 91, y, 45, 6, '', "Policy End Date", true);
  drawCell(startX1 + 136, y, 46, 6, '', validUntilDate, false);
  y += 6;

  drawCell(startX1, y, 45, 6, '', "Plan Name", true);
  drawCell(startX1 + 45, y, 46, 6, '', policy.policyName, false);
  drawCell(startX1 + 91, y, 45, 6, '', "Total Premium Paid (`)", true);
  drawCell(startX1 + 136, y, 46, 6, '', `Rs. ${Math.round(calcPaid).toLocaleString('en-IN')}`, false);
  y += 6;

  drawCell(startX1, y, 45, 6, '', "GSTIN Number (Customer)", true);
  drawCell(startX1 + 45, y, 46, 6, '', "NA", false);
  drawCell(startX1 + 91, y, 45, 6, '', "GSTIN Reg.No (ICICI Lombard)", true);
  drawCell(startX1 + 136, y, 46, 6, '', "33AAACI7904G2ZT", false);
  y += 6;

  drawCell(startX1, y, 45, 6, '', "Servicing Branch Name", true);
  drawCell(startX1 + 45, y, 46, 6, '', "Chennai Main Branch", false);
  drawCell(startX1 + 91, y, 45, 6, '', "Servicing Branch Address", true);
  drawCell(startX1 + 136, y, 46, 6, '', "Seethakathi Centre, Chennai", false);
  y += 10;

  // Premium Details Table on Tax Page
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('Premium Details (Rs.)', startX1, y);
  y += 3;

  drawCell(startX1, y, premW, 6, '', 'Basic Premium', true);
  drawCell(startX1 + premW, y, premW, 6, '', 'CGST (9%)', true);
  drawCell(startX1 + premW * 2, y, premW, 6, '', 'SGST (9%)', true);
  drawCell(startX1 + premW * 3, y, premW, 6, '', 'Total Tax Payable', true);
  drawCell(startX1 + premW * 4, y, premW, 6, '', 'Total Premium', true);
  y += 6;

  drawCell(startX1, y, premW, 6, '', `Rs. ${basicVal.toLocaleString('en-IN')}`, false);
  drawCell(startX1 + premW, y, premW, 6, '', `Rs. ${cgstVal}`, false);
  drawCell(startX1 + premW * 2, y, premW, 6, '', `Rs. ${sgstVal}`, false);
  drawCell(startX1 + premW * 3, y, premW, 6, '', `Rs. ${gstVal.toLocaleString('en-IN')}`, false);
  drawCell(startX1 + premW * 4, y, premW, 6, '', `Rs. ${Math.round(calcPaid).toLocaleString('en-IN')}`, false);
  y += 8;

  // Financial Year Row
  drawCell(startX1, y, 91, 6, '', 'Financial Year: 2025-2026', true);
  drawCell(startX1 + 91, y, 91, 6, '', `Amount (Rs.): Rs. ${Math.round(calcPaid).toLocaleString('en-IN')}`, true);
  y += 10;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(21, 128, 61);
  doc.text('The product is eligible for deduction u/s 80D of the Income Tax Act, 1961 and any amendments made thereto.', startX1, y);

  y += 12;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  doc.text('Sincerely,', startX1, y);
  y += 4;
  doc.setFont('helvetica', 'bold');
  doc.text('For ICICI Lombard General Insurance Company Ltd.', startX1, y);

  y += 15;
  doc.text('Authorised Signatory', startX1, y);

  y += 10;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(80, 80, 80);
  doc.text('Note: This certificate must be surrendered to the Insurance Company in case of Cancellation of the Policy.', startX1, y);

  // ==========================================
  // PAGE 4: Policy Coverages & Benefits
  // ==========================================
  doc.addPage();
  drawICICIPageHeaderFooter(doc, 4, totalPages);

  y = 20;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(primaryNavy[0], primaryNavy[1], primaryNavy[2]);
  doc.text('Complete Health Insurance Coverage Schedule & Endorsements', 14, y);

  y += 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('Inbuilt Benefits Included:', 14, y);
  y += 5;

  const bList = [
    '• In-patient Hospitalization Treatment Cover (Room Rent, ICU, Doctor Fees, Medicines)',
    '• Pre-Hospitalization Coverage up to 60 days & Post-Hospitalization up to 90 days',
    '• Day Care Procedures & Advanced Surgeries (Robotic, Cyberknife, Laser Treatments)',
    '• Domiciliary Hospitalization & AYUSH Inpatient Treatment (Ayurveda, Unani, Siddha, Homeopathy)',
    '• Road Ambulance Charges Cover up to Rs. 10,000 per hospitalization',
    '• Donor Expenses for Organ Transplantation Covered',
    '• Emergency Air Ambulance Cover up to Rs. 5 Lakhs per policy period',
    '• Reset / Restoration Benefit: 100% Reload of Sum Insured for unrelated illnesses'
  ];

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(40, 40, 40);
  bList.forEach(b => {
    doc.text(b, 18, y);
    y += 5;
  });

  // ==========================================
  // PAGE 5: ICICI Lombard Health Care Cards
  // ==========================================
  doc.addPage();
  drawICICIPageHeaderFooter(doc, 5, totalPages);

  y = 20;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(primaryNavy[0], primaryNavy[1], primaryNavy[2]);
  doc.text('ICICI Lombard Health Care Cards (Member Cashless Cards)', 14, y);

  y += 8;

  policy.members.forEach((mem, idx) => {
    // Card Container (Front + Back side by side or stacked)
    const cardY = y;
    const cardW = 86;
    const cardH = 50;

    // --- FRONT OF CARD (Left Box) ---
    doc.setFillColor(255, 255, 255);
    doc.rect(startX1, cardY, cardW, cardH, 'F');
    doc.setDrawColor(234, 88, 12);
    doc.setLineWidth(0.4);
    doc.rect(startX1, cardY, cardW, cardH, 'D');

    // Card Header Bar
    doc.setFillColor(234, 88, 12);
    doc.rect(startX1, cardY, cardW, 5, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6);
    doc.setTextColor(255, 255, 255);
    doc.text('ICICI Lombard Health Care Card', startX1 + 3, cardY + 3.5);

    // Sub Logo
    doc.setTextColor(0, 43, 73);
    doc.setFontSize(7.5);
    doc.text('ICICI Lombard Health Care', startX1 + 35, cardY + 10);

    // Member Info
    doc.setFontSize(6.5);
    doc.setTextColor(0, 0, 0);
    doc.text(`Name    :  ${mem.name.toUpperCase()}`, startX1 + 3, cardY + 16);
    doc.text(`Policy No.:  ${policy.policyNumber}/04/000`, startX1 + 3, cardY + 21);
    doc.text(`Card No.  :  10347988${idx + 4}`, startX1 + 3, cardY + 26);
    doc.text(`Gender  :  ${mem.gender}    Age : ${mem.age}    DOB : ${mem.dob}`, startX1 + 3, cardY + 31);
    doc.text(`Valid Upto:  ${validUntilDate}`, startX1 + 3, cardY + 36);

    // Card Footer Strip
    doc.setFillColor(0, 43, 73);
    doc.rect(startX1, cardY + 42, cardW, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(6);
    doc.text('ICICI Lombard Nibhaye Vaade', startX1 + 3, cardY + 47);
    doc.setTextColor(255, 200, 160);
    doc.text('Toll Free No.: 1800 2666', startX1 + 48, cardY + 47);

    // --- BACK OF CARD (Right Box) ---
    const backX = startX1 + cardW + 8;
    doc.setFillColor(250, 250, 250);
    doc.rect(backX, cardY, cardW, cardH, 'F');
    doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
    doc.setLineWidth(0.2);
    doc.rect(backX, cardY, cardW, cardH, 'D');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5);
    doc.setTextColor(234, 88, 12);
    doc.text('Health Assistance Helpline: 040-6674205 (8 am to 8 pm Mon-Sat)', backX + 2, cardY + 4);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(4.8);
    doc.setTextColor(50, 50, 50);

    const helpNotice = [
      '• For second opinion, doctor appointment, post hospitalization care call 040-6674205.',
      '• Card is non-transferable & valid at network hospitals only.',
      '• Cashless access obtained with authorization letter issued by ICICI Lombard.',
      '• Produce this card along with photo ID card issued by Government.',
      'Mailing Address: ICICI Lombard Healthcare, Varun Towers-II, Begumpet, Hyderabad-500016.',
      'Reg Office: ICICI Lombard House, 414, P Balu Marg, Prabhadevi, Mumbai-400025.',
      'Toll Free: 1800 2666 | Email: ihealthcare@icicilombard.com | www.icicilombard.com'
    ];

    let bY = cardY + 8;
    helpNotice.forEach(line => {
      const splitL = doc.splitTextToSize(line, cardW - 4);
      doc.text(splitL, backX + 2, bY);
      bY += 5;
    });

    y += cardH + 12;
  });

  // ==========================================
  // PAGE 6: Claims Procedure & Network Directory
  // ==========================================
  doc.addPage();
  drawICICIPageHeaderFooter(doc, 6, totalPages);

  y = 20;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(primaryNavy[0], primaryNavy[1], primaryNavy[2]);
  doc.text('Cashless Claims Guide & Hospitalization Protocol', 14, y);

  y += 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('How to Avail Cashless Treatment at Network Hospital:', 14, y);

  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(40, 40, 40);

  const steps = [
    '1. Locate Empanelled Network Hospital via ICICI Lombard IL TakeCare App or website.',
    '2. Show ICICI Lombard Health Card & Photo ID at hospital Insurance / TPA Desk.',
    '3. Hospital submits Pre-authorization Request Form to ICICI Lombard Cashless Desk.',
    '4. ICICI Lombard processes cashless approval within 30 minutes to 1 hour.',
    '5. At discharge, ICICI Lombard settles eligible medical bill directly with the hospital.'
  ];

  steps.forEach(s => {
    doc.text(s, 18, y);
    y += 5.5;
  });

  doc.save(`${policy.policyNumber}_ICICI_Lombard_Policy_Schedule_${effectiveTenure}Year.pdf`);
}

export function generateHealthCardPDF(policy: CustomerPolicy, member?: InsuredMember, overrideTenure?: number) {
  const targetMembers = member ? [member] : policy.members;
  const effectiveTenure = overrideTenure || policy.selectedTenure || 1;
  const isRenewed = policy.policyStatus === 'Renewed' || policy.renewalStatus === 'Renewed' || Boolean(policy.newPolicyEndDate);

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: [85, 54] // Standard ID card dimensions (85mm x 54mm)
  });
  
  let validUntil = policy.newPolicyEndDate || policy.previousPolicyEndDate;
  if (isRenewed) {
    const basePrev = policy.previousPolicyEndDate || '2026-03-31';
    try {
      const pEnd = new Date(basePrev);
      const rEnd = new Date(pEnd);
      rEnd.setFullYear(rEnd.getFullYear() + effectiveTenure);
      validUntil = rEnd.toISOString().split('T')[0];
    } catch {}
  }

  targetMembers.forEach((mem, idx) => {
    if (idx > 0) doc.addPage([85, 54], 'landscape');

    // Background Card Styling - ICICI Lombard Clean White Card with Orange Accent
    doc.setFillColor(255, 255, 255); 
    doc.rect(0, 0, 85, 54, 'F');

    // Card Outer Border
    doc.setDrawColor(234, 88, 12);
    doc.setLineWidth(0.5);
    doc.rect(0, 0, 85, 54, 'D');

    // Top Orange Header Strip
    doc.setFillColor(234, 88, 12); 
    doc.rect(0, 0, 85, 5, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.text('ICICI Lombard Health Care Card', 3, 3.5);

    // Sub Logo Header
    doc.setTextColor(0, 43, 73);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('ICICI Lombard Health Care', 38, 10);

    // Member Details Text
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(0, 0, 0);
    doc.text(`Name    :  ${mem.name.toUpperCase()}`, 3, 16);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.text(`Policy No.:  ${policy.policyNumber}/04/000`, 3, 21);
    doc.text(`Card No.  :  10347988${idx + 4}`, 3, 26);
    doc.text(`Gender  :  ${mem.gender}    Age : ${mem.age}    DOB : ${mem.dob}`, 3, 31);
    doc.text(`Valid Upto:  ${validUntil}`, 3, 36);

    // Bottom Navy Footer Strip
    doc.setFillColor(0, 43, 73);
    doc.rect(0, 44, 85, 10, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6);
    doc.text('ICICI Lombard Nibhaye Vaade', 3, 49);

    doc.setTextColor(255, 200, 160);
    doc.text('Toll Free No.: 1800 2666', 48, 49);
  });

  const filename = member 
    ? `${policy.policyNumber}_ICICI_Lombard_HealthCard_${member.name.replace(/\s+/g, '_')}.pdf`
    : `${policy.policyNumber}_ICICI_Lombard_All_HealthCards.pdf`;

  doc.save(filename);
}
