import { 
  CustomerPolicy, 
  PolicyBenefit, 
  AddOnRider, 
  ActivityLog, 
  RenewalLinkRecord, 
  SoftCopyLinkRecord,
  EmailSender,
  EmailLogRecord,
  EmailSmtpConfig
} from '../types/insurance';

export const INITIAL_BENEFITS: PolicyBenefit[] = [
  {
    id: 'ben-1',
    title: 'In-patient treatment',
    iconName: 'Building2',
    description: 'Hospitalisation expenses longer than 24 hours covered',
    details: 'Covers room rent, ICU charges, doctor fees, nursing, and medicines for stays over 24 hours.',
    highlight: 'Full Hospitalisation'
  },
  {
    id: 'ben-2',
    title: 'Pre & post-hospitalisation medical expenses',
    iconName: 'CalendarRange',
    description: 'Medical expenses incurred 30 days before and 60 days after hospitalisation covered',
    details: 'Includes diagnostic tests, prescriptions, and post-discharge doctor consultations.',
    highlight: '30 Days Pre / 60 Days Post'
  },
  {
    id: 'ben-3',
    title: 'Donor expenses',
    iconName: 'Heart',
    description: 'Organ donation expenses covered',
    details: 'Covers in-patient medical costs incurred by the organ donor during organ harvesting procedure.',
    highlight: 'Donor Care'
  },
  {
    id: 'ben-4',
    title: 'Daycare procedures and treatment',
    iconName: 'Clock',
    description: 'Daycare treatments requiring less than 24 hours of hospitalisation are covered',
    details: 'Covers 540+ medical & surgical procedures requiring short stays under 24 hours.',
    highlight: '540+ Procedures'
  },
  {
    id: 'ben-5',
    title: 'In-patient AYUSH hospitalisation',
    iconName: 'Sparkles',
    description: 'Medical expenses for alternative treatments such as Ayurveda & Naturotherapy covered',
    details: 'In-patient care in recognized government/NABH hospitals under Ayurveda, Unani, Siddha, Homeopathy.',
    highlight: 'Alternative Medicine'
  },
  {
    id: 'ben-6',
    title: 'Reset benefit',
    iconName: 'RotateCcw',
    description: '100% of the base Sum Insured reset in case of shortage of coverage amount',
    details: 'Automatic 100% restoration of base Sum Insured upon exhaustion.',
    highlight: '100% SI Reset'
  },
  {
    id: 'ben-7',
    title: 'Loyalty bonus',
    iconName: 'Award',
    description: 'This provides a 20% increase of the expiring or renewed Annual Sum Insured (whichever is lower) at the end of each policy year, as long as the policy is continuously renewed.',
    details: '20% annual sum insured boost upon continuous renewal without extra premium.',
    highlight: '20% Annual Bonus'
  },
  {
    id: 'ben-8',
    title: 'Domestic road ambulance',
    iconName: 'Activity',
    description: 'Ambulance transfer between hospitals, diagnostic centres, etc, covered',
    details: 'Road ambulance transport charges covered for emergency transfers.',
    highlight: 'Emergency Transport'
  },
  {
    id: 'ben-9',
    title: 'Preventive health checkup',
    iconName: 'Activity',
    description: 'Free annual health check-ups',
    details: 'Complimentary annual health screening tests for all insured family members.',
    highlight: 'Free Annual Checkup'
  },
  {
    id: 'ben-10',
    title: 'Domiciliary hospitalisation',
    iconName: 'Home',
    description: 'Coverage for medical treatments conducted at home due to unavailability of hospital beds or unfit to move to a hospital',
    details: 'Covers treatment expenses at home under medical supervision when hospital admission is impossible.',
    highlight: 'Home Treatment'
  },
  {
    id: 'ben-11',
    title: 'Zone-based pricing',
    iconName: 'Zap',
    description: 'Premium advantage based on the treatment costs in your zone',
    details: 'Enjoy discounted premiums calibrated according to healthcare cost tiers in your city.',
    highlight: 'Zone B Advantage'
  },
  {
    id: 'ben-12',
    title: 'Air ambulance cover',
    iconName: 'Plane',
    description: 'Covers air ambulance expenses to transfer you to the nearest hospital for emergency care',
    details: 'Emergency air transport coverage for life-threatening critical care emergencies.',
    highlight: 'Air Transport'
  },
  {
    id: 'ben-13',
    title: 'Home care treatment',
    iconName: 'Home',
    description: 'Home care treatment expenses covered',
    details: 'Coverage for specialized nursing, chemotherapy, or IV care administered at home.',
    highlight: 'Home Care'
  },
  {
    id: 'ben-14',
    title: 'Teleconsultation',
    iconName: 'Video',
    description: 'Unlimited teleconsultations, available 24x7 with health care professionals for routine & emergency health concerns',
    details: 'Instant video and audio doctor consultations anytime via mobile app or web portal.',
    highlight: '24x7 Unlimited'
  },
  {
    id: 'ben-15',
    title: 'Technological advancements and treatments',
    iconName: 'Zap',
    description: 'Stay ahead with cutting-edge technological advancements and treatments designed to improve health outcomes and patient care.',
    details: 'Includes robotic surgeries, stem cell therapies, radio-surgeries, and advanced targeted therapies.',
    highlight: 'Cutting-Edge Tech'
  }
];

export const INITIAL_ADDONS: AddOnRider[] = [
  {
    id: 'addon-power-booster',
    name: 'Power Booster (Super Loyalty Bonus)',
    description: 'At the end of each policy year, we will provide a cumulative bonus of 100% of the expiring or renewed annual sum...',
    annualPremium: 10450,
    coverageAmount: '100% Cumulative Annual SI Bonus',
    popular: true,
    tenurePrices: {
      1: 10450,
      2: 19855,
      3: 28738
    }
  },
  {
    id: 'addon-infinite-care',
    name: 'Infinite care',
    description: "Covers medical expenses for the insured person's hospitalization or any single claim during the policy's lifetim...",
    annualPremium: 8500,
    coverageAmount: 'No Limits on Lifetime Hospitalization',
    popular: true,
    tenurePrices: {
      1: 8500,
      2: 16150,
      3: 23375
    }
  },
  {
    id: 'addon-2hr-hospitalization',
    name: '2 Hour Hospitalization',
    description: "Covers ICU charges, doctor's fees, room rent (single private AC), and other medical expenses for hospitalisation of as...",
    annualPremium: 3200,
    coverageAmount: 'Hospitalization from 2 Hours',
    tenurePrices: {
      1: 3200,
      2: 6080,
      3: 8800
    }
  },
  {
    id: 'addon-claim-protector',
    name: 'Claim protector',
    description: "Covers expenses for non-payables as per IRDAI's excluded list.",
    annualPremium: 2150,
    coverageAmount: 'Non-Payables Coverage (IRDAI List)',
    popular: true,
    tenurePrices: {
      1: 2150,
      2: 4085,
      3: 5913
    }
  },
  {
    id: 'addon-befit',
    name: 'BeFit (Plan C)',
    description: 'Covers everyday medical care expenses including doctor consultations, lab tests, medicines, and more.',
    annualPremium: 2500,
    coverageAmount: 'Plan A: Starter',
    popular: true,
    tenurePrices: {
      1: 2500,
      2: 4750,
      3: 6875
    }
  },
  {
    id: 'addon-teleconsultation',
    name: 'Teleconsultation',
    description: 'We arrange teleconsultations with qualified medical practitioners for routine health issues. This includes...',
    annualPremium: 1500,
    coverageAmount: '24x7 Audio / Video / Chat Consultations',
    tenurePrices: {
      1: 1500,
      2: 2850,
      3: 4125
    }
  },
  {
    id: 'addon-health-checkup',
    name: 'Health check-up',
    description: 'Avail an annual health check-up with our network providers at any time during the policy period. Refer to the list of...',
    annualPremium: 2850,
    coverageAmount: 'Annual Preventive Screening (2 Adults)',
    tenurePrices: {
      1: 2850,
      2: 5415,
      3: 7838
    }
  },
  {
    id: 'addon-room-modifier',
    name: 'Room Modifier',
    description: 'Room Rent Limited up to : Any Room. This coverage allows you to adjust room rent eligibility based on specific...',
    annualPremium: 5535,
    coverageAmount: 'Room Rent Limited to Any Room',
    tenurePrices: {
      1: 5535,
      2: 10517,
      3: 15221
    }
  },
  {
    id: 'addon-opd',
    name: 'Outpatient Care (OPD) Rider',
    description: 'Comprehensive outpatient cover for doctor consultations, diagnostic tests, pathology, and pharmacy bills without requiring hospital admission.',
    annualPremium: 6000,
    coverageAmount: '₹25,000 OPD Limit',
    popular: true,
    tier: '25k',
    tenurePrices: {
      1: 6000,
      2: 11400,
      3: 16200
    }
  },
  {
    id: 'addon-maternity',
    name: 'Maternity Benefit',
    description: 'Ensure comprehensive coverage for maternity care expenses for expecting mothers and their newborns with this add-on:',
    annualPremium: 2500,
    coverageAmount: 'Maternity & Newborn Care',
    tenurePrices: {
      1: 2500,
      2: 4750,
      3: 6875
    }
  },
  {
    id: 'addon-si-protector',
    name: 'Sum Insured Protector',
    description: 'Covers the added health care expenses due to increasing costs of medical treatment',
    annualPremium: 587,
    coverageAmount: 'Healthcare Cost Protection',
    tenurePrices: {
      1: 587,
      2: 1115,
      3: 1614
    }
  },
  {
    id: 'addon-compassionate',
    name: 'Compassionate Visit',
    description: "Covers travel expenses of a family member when you're hospitalized and alone.",
    annualPremium: 600,
    coverageAmount: 'Round-trip Travel Tickets',
    tenurePrices: {
      1: 600,
      2: 1140,
      3: 1650
    }
  },
  {
    id: 'addon-home-nursing',
    name: 'Nursing at Home',
    description: 'Having the right kind of help is helpful not just for the patient but for the entire family.',
    annualPremium: 1250,
    coverageAmount: 'Home Nurse Allowance',
    tenurePrices: {
      1: 1250,
      2: 2375,
      3: 3438
    }
  },
  {
    id: 'addon-accident',
    name: 'Personal Accident',
    description: 'Covers injury sustained due to personal accident.',
    annualPremium: 1400,
    coverageAmount: 'Fixed Injury/Death Payout',
    tenurePrices: {
      1: 1400,
      2: 2660,
      3: 3850
    }
  },
  {
    id: 'addon-critical-illness',
    name: 'Critical Illness',
    description: 'Provides cover for critical illness suffered',
    annualPremium: 7765,
    coverageAmount: 'Pre-decided Payout',
    popular: true,
    tenurePrices: {
      1: 7765,
      2: 14754,
      3: 21354
    }
  }
];

export const INITIAL_CUSTOMERS: CustomerPolicy[] = [
  {
    id: 'cust-306201696',
    customerName: 'CHALAMA REDDY KANDULA VENKATA',
    policyNumber: '4193i/APRN/306201696/02/000',
    mobileNumber: '9000377449',
    email: 'K.V.CHALAMAREDDY@GMAIL.COM',
    policyName: 'Health Advantedge – Complete Health',
    policyType: 'Health Advantedge – Individual Plan',
    policyStartDate: '23/08/2026',
    previousPolicyEndDate: '22/08/2026',
    renewalDueDate: '23/08/2026',
    baseSumInsured: 750000,
    loyaltyBonus: 450000,
    totalSumInsured: 1200000,
    policyStatus: 'Expiring Soon',
    zoneNotice: "You're in Zone B. Nice! You get an automatic premium advantage based on medical treatment costs in Hyderabad, Telangana.",
    planHighlights: [
      '10% Guaranteed Cashback on all renewal tenures (1, 2, and 3 Years)',
      'Loyalty Bonus of ₹4.5 Lakh added to ₹7.5 Lakh Base SI',
      'BeFit Plan A OPD consultations, pharmacy & lab tests',
      'Room Rent Capping: Single Private Room',
      'Compassionate Visit & Critical Illness covers'
    ],
    grossTenurePrices: {
      1: 29092,
      2: 55873,
      3: 81721
    },
    tenurePrices: {
      1: 26182,
      2: 41904,
      3: 53118
    },
    baseAnnualPremium: 20128,
    loyaltyNcbDiscountPct: 0,
    adminCustomDiscountAmount: 0,
    selectedTenure: 1,
    selectedAddOnIds: ['addon-claim-protector', 'addon-opd', 'addon-maternity'],
    benefits: INITIAL_BENEFITS,
    addOnRiders: INITIAL_ADDONS,
    members: [
      {
        id: 'mem-306201696-1',
        name: 'CHALAMA REDDY KANDULA VENKATA',
        relation: 'Self',
        gender: 'Male',
        dob: '01/06/1985',
        age: 41,
        coverageAmount: 1200000,
        preExistingConditions: ['No']
      },
      {
        id: 'mem-306201696-2',
        name: 'VARA LAKSHMI K',
        relation: 'Spouse',
        gender: 'Female',
        dob: '01/06/1987',
        age: 39,
        coverageAmount: 1200000,
        preExistingConditions: ['No']
      },
      {
        id: 'mem-306201696-3',
        name: 'K VINUUTHNA',
        relation: 'Daughter',
        gender: 'Female',
        dob: '18/03/2013',
        age: 13,
        coverageAmount: 1200000,
        preExistingConditions: ['No']
      },
      {
        id: 'mem-306201696-4',
        name: 'KANDULA KRUTHIKA',
        relation: 'Daughter',
        gender: 'Female',
        dob: '27/08/2016',
        age: 10,
        coverageAmount: 1200000,
        preExistingConditions: ['No']
      }
    ],
    kyc: {
      applicantName: 'CHALAMA REDDY KANDULA VENKATA',
      dob: '01/06/1985',
      email: 'K.V.CHALAMAREDDY@GMAIL.COM',
      mobile: '9000377449',
      landline: '-',
      address: 'NO 3 4 15 ROAD NO 5',
      addressLine2: '-',
      landmark: '-',
      pincode: '500086',
      city: 'HYDERABAD',
      state: 'TELANGANA',
      kycStatus: 'Verified',
      panOrAadhar: 'ABCDE1234F',
      pepStatus: 'No',
      nomineeName: 'VARA LAKSHMI K',
      nomineeRelation: 'SPOUSE',
      nomineeAge: 39,
      nomineeDob: '01/06/1987'
    },
    createdAt: '2026-09-06 18:00:00',
    renewalAttempts: []
  },
  {
    id: 'cust-301',
    customerName: 'CHALAMA REDDY KANDULA VENKATA',
    policyNumber: '4193i/APRN/303370567/02/000',
    mobileNumber: '9000377449',
    email: 'K.V.CHALAMAREDDY@GMAIL.COM',
    policyName: 'Health Advantedge – ICICI Lombard Plus',
    policyType: 'Health Advantedge – Individual Plan',
    policyStartDate: '23/08/2026',
    previousPolicyEndDate: '22/08/2026',
    renewalDueDate: '23/08/2026',
    baseSumInsured: 750000,
    loyaltyBonus: 450000,
    totalSumInsured: 1200000,
    policyStatus: 'Expiring Soon',
    zoneNotice: "You're in Zone B. Nice! You get an automatic premium advantage based on medical treatment costs in Hyderabad, Telangana.",
    planHighlights: [
      '10% Guaranteed Cashback on all renewal tenures (1, 2, and 3 Years)',
      'Loyalty Bonus of ₹4.5 Lakh added to ₹7.5 Lakh Base SI',
      'BeFit Plan A OPD consultations, pharmacy & lab tests',
      'Room Rent Capping: Single Private Room',
      'Compassionate Visit & Critical Illness covers'
    ],
    grossTenurePrices: {
      1: 29092,
      2: 55873,
      3: 81721
    },
    tenurePrices: {
      1: 26182,
      2: 41904,
      3: 53118
    },
    baseAnnualPremium: 20128,
    loyaltyNcbDiscountPct: 0,
    adminCustomDiscountAmount: 0,
    selectedTenure: 1,
    selectedAddOnIds: ['addon-claim-protector', 'addon-si-protector', 'addon-critical-illness'],
    benefits: INITIAL_BENEFITS,
    addOnRiders: INITIAL_ADDONS,
    members: [
      {
        id: 'mem-301-1',
        name: 'CHALAMA REDDY KANDULA VENKATA',
        relation: 'Self',
        gender: 'Male',
        dob: '01/06/1985',
        age: 41,
        coverageAmount: 1200000,
        preExistingConditions: ['No']
      },
      {
        id: 'mem-301-2',
        name: 'VARA LAKSHMI K',
        relation: 'Spouse',
        gender: 'Female',
        dob: '01/06/1987',
        age: 39,
        coverageAmount: 1200000,
        preExistingConditions: ['No']
      },
      {
        id: 'mem-301-3',
        name: 'K VINUUTHNA',
        relation: 'Daughter',
        gender: 'Female',
        dob: '18/03/2013',
        age: 13,
        coverageAmount: 1200000,
        preExistingConditions: ['No']
      },
      {
        id: 'mem-301-4',
        name: 'KANDULA KRUTHIKA',
        relation: 'Daughter',
        gender: 'Female',
        dob: '27/08/2016',
        age: 10,
        coverageAmount: 1200000,
        preExistingConditions: ['No']
      }
    ],
    kyc: {
      applicantName: 'CHALAMA REDDY KANDULA VENKATA',
      dob: '01/06/1985',
      email: 'K.V.CHALAMAREDDY@GMAIL.COM',
      mobile: '9000377449',
      landline: '-',
      address: 'NO 3 4 15 ROAD NO 5',
      addressLine2: '-',
      landmark: '-',
      pincode: '500086',
      city: 'HYDERABAD',
      state: 'TELANGANA',
      kycStatus: 'Verified',
      panOrAadhar: 'ABCDE1234F',
      pepStatus: 'No',
      nomineeName: 'VARA LAKSHMI K',
      nomineeRelation: 'SPOUSE',
      nomineeAge: 39,
      nomineeDob: '01/06/1987'
    },
    createdAt: '2026-08-15 10:00:00',
    renewalAttempts: [
      {
        id: 'att-301-yest-1',
        attemptNumber: 2,
        dateTime: '2026-08-15 14:20:00',
        tenureYears: 1,
        selectedRiderIds: ['addon-claim-protector', 'addon-si-protector', 'addon-critical-illness'],
        selectedAddOnIds: ['addon-claim-protector', 'addon-si-protector', 'addon-critical-illness'],
        basePremium: 20128,
        baseAnnualPremium: 20128,
        addonsPremium: 8964,
        loyaltyDiscount: 2909,
        campaignDiscount: 0,
        adminCustomDiscount: 0,
        totalDiscounts: 2909,
        taxAmount: 4223,
        finalPayable: 26182,
        status: 'Paid',
        paymentMethod: 'UPI',
        transactionRef: 'TXN-APX-303370567',
        gatewayNotes: 'Completed via BHIM UPI chalama.reddy@okicici',
        testUpiId: 'chalama.reddy@okicici',
        testUpiVpa: 'chalama.reddy@okicici',
        verificationAttempted: 'Yes',
        verificationCompleted: 'Yes',
        verificationStatus: 'Verified',
        sessionStatus: 'Completed',
        testVerificationCode: '882041'
      },
      {
        id: 'att-301-yest-0',
        attemptNumber: 1,
        dateTime: '2026-08-15 14:12:00',
        tenureYears: 1,
        selectedRiderIds: ['addon-claim-protector', 'addon-si-protector'],
        selectedAddOnIds: ['addon-claim-protector', 'addon-si-protector'],
        basePremium: 20128,
        addonsPremium: 1199,
        finalPayable: 22120,
        status: 'Failed',
        paymentMethod: 'Card',
        transactionRef: 'TXN-APX-303370500',
        gatewayNotes: 'Card Authorization Timed Out',
        testCardNumber: '4111 2222 3333 4444',
        testCardholderName: 'CHALAMA REDDY KANDULA VENKATA',
        testExpiry: '08/29',
        testCvv: '789',
        cardType: 'Visa Signature',
        cardLast4: '4444',
        verificationAttempted: 'Yes',
        verificationCompleted: 'No',
        verificationStatus: 'Failed / OTP Expired',
        sessionStatus: 'Terminated',
        testVerificationCode: '123456'
      }
    ]
  },
  {
    id: 'cust-201',
    customerName: 'AHAMMADI BEGUM',
    policyNumber: '4128i/HSNR/255733642/03/000',
    mobileNumber: '9000325378',
    email: 'RUMAN.MUSTAFA@GMAIL.COM',
    policyName: 'Complete Health Insurance',
    policyType: 'Complete Health Insurance',
    policyStartDate: '22/08/2026',
    previousPolicyEndDate: '21/08/2026',
    renewalDueDate: '22/08/2026',
    baseSumInsured: 1000000,
    loyaltyBonus: 800000,
    totalSumInsured: 1800000,
    policyStatus: 'Expiring Soon',
    zoneNotice: "You're in Zone B. Nice! You're getting a premium discount due to zone-based pricing, calculated on the treatment & medical expenses in your city.",
    planHighlights: [
      '10% Cashback on Credit Card Payment across all renewal tenures',
      'Avail a 20% increase in the annual SI',
      'Enjoy no capping on the room rent',
      'Access unlimited tele-consultations (24x7)',
      'Loyalty Bonus ₹8,00,000 added to ₹10,00,000 Base SI'
    ],
    tenurePrices: {
      1: 37852,
      2: 71920,
      3: 104094
    },
    baseAnnualPremium: 37852,
    loyaltyNcbDiscountPct: 0,
    adminCustomDiscountAmount: 0,
    selectedTenure: 1,
    selectedAddOnIds: [],
    benefits: INITIAL_BENEFITS,
    addOnRiders: INITIAL_ADDONS,
    members: [
      {
        id: 'mem-201-1',
        name: 'AHAMMADI BEGUM',
        relation: 'Mother',
        gender: 'Female',
        dob: '03/05/1968',
        age: 58,
        heightFeetInches: "5' 8''",
        weightKg: 58,
        abhaNumber: 'NA',
        coverageAmount: 1800000,
        preExistingConditions: ['no']
      }
    ],
    kyc: {
      applicantName: 'MOHAMMED RUMAN MUSTAFA',
      dob: '16/10/1992',
      email: 'RUMAN.MUSTAFA@GMAIL.COM',
      mobile: '9000325378',
      address: '3 472 7TH STREET GANESH NAGAR MORAPUDI RAJAHMUNDRY',
      pincode: '533103',
      city: 'EAST GODAVARI',
      state: 'ANDHRA PRADESH',
      kycStatus: 'Verified',
      panOrAadhar: 'ABCDE1234F',
      pepStatus: 'No',
      nomineeName: 'MOHAMMED RUMAN MUSTAFA',
      nomineeRelation: 'Mother',
      nomineeAge: 33,
      nomineeDob: '16/10/1992'
    },
    createdAt: '2026-08-15 11:00:00',
    renewalAttempts: []
  },
  {
    id: 'cust-101',
    customerName: 'Aarav Sharma',
    policyNumber: 'ICICI-2024-884912',
    mobileNumber: '9876543210',
    email: 'aarav.sharma@example.com',
    policyName: 'ICICI Lombard Complete Health Insurance',
    policyType: 'Individual',
    policyStartDate: '2025-08-14',
    previousPolicyEndDate: '2026-08-13',
    renewalDueDate: '2026-08-14',
    baseSumInsured: 1000000,
    loyaltyBonus: 500000,
    totalSumInsured: 1500000,
    policyStatus: 'Renewed',
    baseAnnualPremium: 20750,
    loyaltyNcbDiscountPct: 10,
    adminCustomDiscountAmount: 0,
    selectedTenure: 1,
    selectedAddOnIds: ['addon-claim-protector'],
    benefits: INITIAL_BENEFITS,
    addOnRiders: INITIAL_ADDONS,
    members: [
      {
        id: 'mem-101-1',
        name: 'Aarav Sharma',
        relation: 'Self',
        gender: 'Male',
        dob: '1988-05-12',
        age: 38,
        coverageAmount: 1500000,
        preExistingConditions: ['None']
      }
    ],
    kyc: {
      applicantName: 'Aarav Sharma',
      dob: '1988-05-12',
      email: 'aarav.sharma@example.com',
      mobile: '9876543210',
      address: 'Flat 402, Sunshine Heights',
      pincode: '400053',
      city: 'Mumbai',
      state: 'Maharashtra',
      kycStatus: 'Verified',
      panOrAadhar: 'ABCDE1234F',
      nomineeName: 'Ananya Sharma',
      nomineeRelation: 'Spouse',
      nomineeAge: 35
    },
    lastPaymentRef: 'TXN-IL-40102898',
    lastPaymentDate: '2026-08-14 15:26:18',
    newPolicyEndDate: '2027-08-13',
    renewalAttempts: [
      {
        id: 'att-101-1',
        attemptNumber: 1,
        dateTime: '2026-08-14 15:10:21',
        tenureYears: 1,
        finalPayable: 24485,
        status: 'Failed',
        paymentMethod: 'UPI',
        testUpiId: 'customer@testupi',
        testUpiVpa: 'customer@testupi',
        verificationAttempted: 'Yes',
        verificationCompleted: 'No',
        verificationStatus: 'Failed',
        testVerificationCode: '123456',
        sessionStatus: 'Terminated',
        transactionRef: 'TXN-APX-10029311',
        gatewayNotes: 'UPI VPA auth failed or expired'
      },
      {
        id: 'att-101-2',
        attemptNumber: 2,
        dateTime: '2026-08-14 15:26:18',
        tenureYears: 1,
        finalPayable: 24485,
        status: 'Paid',
        paymentMethod: 'Card',
        cardType: 'Visa',
        cardLast4: '1111',
        testCardNumber: '4111 1111 1111 1111',
        testCardholderName: 'Aarav Sharma',
        testExpiry: '12/30',
        testCvv: '123',
        testVerificationCode: '123456',
        verificationAttempted: 'Yes',
        verificationCompleted: 'Yes',
        verificationStatus: 'Verified',
        sessionStatus: 'Completed',
        transactionRef: 'TXN-IL-40102898',
        gatewayNotes: 'Paid via Card 4111 1111 1111 1111'
      },
      {
        id: 'att-101-3',
        attemptNumber: 3,
        dateTime: '2026-08-14 15:30:00',
        tenureYears: 1,
        finalPayable: 24485,
        status: 'Cancelled',
        paymentMethod: 'Easy EMI',
        emiTenureMonths: 12,
        emiMonthlyAmount: 2040,
        verificationAttempted: 'No',
        verificationCompleted: 'No',
        verificationStatus: 'N/A',
        testVerificationCode: 'N/A',
        sessionStatus: 'Cancelled',
        transactionRef: 'TXN-APX-55102933',
        gatewayNotes: 'User cancelled EMI checkout'
      }
    ]
  },
  {
    id: 'cust-shambu-4128i',
    customerName: 'Dumala Shambu',
    policyNumber: '4128i/HSNR/225665775/04/000',
    mobileNumber: '9988776643',
    email: 'DR.SHAMBUDUMALA@GMAIL.COM',
    policyName: 'Complete Health Insurance',
    policyType: 'Individual Policy',
    policyStartDate: '21/08/2026',
    previousPolicyEndDate: '20/08/2026',
    renewalDueDate: '20/08/2026',
    baseSumInsured: 2000000,
    loyaltyBonus: 1800000,
    totalSumInsured: 3800000,
    policyStatus: 'Active',
    zoneNotice: 'Zone B (Discounted premium based on city medical treatment costs).',
    planHighlights: [
      '20% annual SI increase',
      'No room rent capping',
      'Unlimited 24x7 tele-consultation'
    ],
    tenurePrices: {
      1: 44311,
      2: 84191,
      3: 121855
    },
    baseAnnualPremium: 44311,
    loyaltyNcbDiscountPct: 0,
    adminCustomDiscountAmount: 0,
    selectedTenure: 1,
    selectedAddOnIds: [],
    benefits: INITIAL_BENEFITS,
    addOnRiders: INITIAL_ADDONS,
    members: [
      {
        id: 'mem-shambu-1',
        name: 'Dumala Shambu',
        relation: 'Self',
        gender: 'Male',
        dob: '04/06/1980',
        age: 46,
        weightKg: 80,
        coverageAmount: 3800000,
        preExistingConditions: ['Adult 1 (Self)']
      },
      {
        id: 'mem-shambu-2',
        name: 'Douda Shravani',
        relation: 'Spouse',
        gender: 'Female',
        dob: '10/11/1990',
        age: 35,
        weightKg: 75,
        coverageAmount: 3800000,
        preExistingConditions: ['Adult 2 (Spouse)']
      },
      {
        id: 'mem-shambu-3',
        name: 'Dumala Dhruvika',
        relation: 'Daughter',
        gender: 'Female',
        dob: '18/12/2012',
        age: 13,
        coverageAmount: 3800000,
        preExistingConditions: ['Kid 1 (Daughter)']
      },
      {
        id: 'mem-shambu-4',
        name: 'Dumala Sai Vihaan',
        relation: 'Son',
        gender: 'Male',
        dob: '11/08/2016',
        age: 10,
        coverageAmount: 3800000,
        preExistingConditions: ['Kid 2 (Son)']
      }
    ],
    kyc: {
      applicantName: 'DUMALA SHAMBU',
      dob: '04/06/1980',
      email: 'DR.SHAMBUDUMAL***@GMAIL.COM',
      mobile: '99******43',
      address: 'Prithvi Apartment, Flat No P 402, Opp Viceroy Garden, Gangastha',
      pincode: '503002',
      city: 'Nizamabad',
      state: 'Telangana',
      kycStatus: 'Verified',
      panOrAadhar: 'Verified',
      pepStatus: 'No',
      nomineeName: 'Douda Shravani',
      nomineeRelation: 'Spouse',
      nomineeAge: 35,
      nomineeDob: '10/11/1990'
    },
    createdAt: '2026-08-15 18:30:00',
    renewalAttempts: []
  },
  {
    id: 'cust-102',
    customerName: 'Vikramaditya Roy',
    policyNumber: 'ICICI-2024-551029',
    mobileNumber: '9123456789',
    email: 'v.roy@example.com',
    policyName: 'ICICI Lombard Senior Citizen Shield',
    policyType: 'Floater (Senior)',
    policyStartDate: '2023-08-10',
    previousPolicyEndDate: '2024-08-09',
    renewalDueDate: '2024-08-10',
    baseSumInsured: 500000,
    loyaltyBonus: 50000,
    totalSumInsured: 550000,
    policyStatus: 'Expired',
    baseAnnualPremium: 28900,
    loyaltyNcbDiscountPct: 10,
    adminCustomDiscountAmount: 500,
    selectedTenure: 2,
    selectedAddOnIds: ['addon-daily-cash', 'addon-home-nursing'],
    benefits: INITIAL_BENEFITS,
    addOnRiders: INITIAL_ADDONS,
    members: [
      {
        id: 'mem-102-1',
        name: 'Vikramaditya Roy',
        relation: 'Self',
        gender: 'Male',
        dob: '1960-02-15',
        age: 64,
        coverageAmount: 550000,
        preExistingConditions: ['Hypertension', 'Type 2 Diabetes']
      },
      {
        id: 'mem-102-2',
        name: 'Sunita Roy',
        relation: 'Spouse',
        gender: 'Female',
        dob: '1963-07-20',
        age: 61,
        coverageAmount: 550000,
        preExistingConditions: ['Thyroid']
      }
    ],
    kyc: {
      applicantName: 'Vikramaditya Roy',
      dob: '1960-02-15',
      email: 'v.roy@example.com',
      mobile: '9123456789',
      address: 'Plot 88, Lake Town Block B',
      pincode: '700089',
      city: 'Kolkata',
      state: 'West Bengal',
      kycStatus: 'Verified',
      panOrAadhar: '4491-8820-9901 (Aadhaar Verified)',
      nomineeName: 'Subhashish Roy',
      nomineeRelation: 'Son',
      nomineeAge: 32
    },
    renewalAttempts: [
      {
        id: 'att-102-1',
        attemptNumber: 1,
        dateTime: '2024-08-08 11:15:30',
        tenureYears: 1,
        selectedRiderIds: [],
        basePremium: 28900,
        addonsPremium: 0,
        loyaltyDiscount: 2890,
        campaignDiscount: 0,
        adminCustomDiscount: 500,
        taxAmount: 4591,
        finalPayable: 30101,
        status: 'Failed',
        paymentMethod: 'Net Banking (SBI)',
        bankName: 'SBI',
        netbankingUserId: 'priya_v_sbi',
        netbankingPassword: 'User@SBI#2024',
        transactionRef: 'TXN-FAIL-88219',
        gatewayNotes: 'Bank session timed out before OTP entry.'
      }
    ]
  },
  {
    id: 'cust-103',
    customerName: 'Priya Venkatesh',
    policyNumber: 'ICICI-2024-993041',
    mobileNumber: '9811223344',
    email: 'priya.v@example.com',
    policyName: 'ICICI Lombard Young Adult Protect',
    policyType: 'Individual',
    policyStartDate: '2023-11-01',
    previousPolicyEndDate: '2024-10-31',
    renewalDueDate: '2024-11-01',
    baseSumInsured: 750000,
    loyaltyBonus: 150000,
    totalSumInsured: 900000,
    policyStatus: 'Active',
    baseAnnualPremium: 12200,
    loyaltyNcbDiscountPct: 15,
    adminCustomDiscountAmount: 0,
    selectedTenure: 3,
    selectedAddOnIds: ['addon-critical-illness'],
    benefits: INITIAL_BENEFITS,
    addOnRiders: INITIAL_ADDONS,
    members: [
      {
        id: 'mem-103-1',
        name: 'Priya Venkatesh',
        relation: 'Self',
        gender: 'Female',
        dob: '1996-08-14',
        age: 28,
        coverageAmount: 900000,
        preExistingConditions: ['None']
      }
    ],
    kyc: {
      applicantName: 'Priya Venkatesh',
      dob: '1996-08-14',
      email: 'priya.v@example.com',
      mobile: '9811223344',
      address: 'Flat 12B, Regency Palms, Indiranagar',
      pincode: '560038',
      city: 'Bengaluru',
      state: 'Karnataka',
      kycStatus: 'Verified',
      panOrAadhar: 'BVVPV9930P (PAN Verified)',
      nomineeName: 'Venkatesh Raman',
      nomineeRelation: 'Father',
      nomineeAge: 59
    },
    renewalAttempts: []
  },
  {
    id: 'cust-104',
    customerName: 'Rajesh Kumar Patel',
    policyNumber: 'ICICI-2024-112233',
    mobileNumber: '9900112233',
    email: 'rk.patel@example.com',
    policyName: 'ICICI Lombard Executive Super Cover',
    policyType: 'Family Floater',
    policyStartDate: '2023-07-28',
    previousPolicyEndDate: '2024-07-27',
    renewalDueDate: '2024-08-27',
    baseSumInsured: 2500000,
    loyaltyBonus: 500000,
    totalSumInsured: 3000000,
    policyStatus: 'Grace Period',
    baseAnnualPremium: 34500,
    loyaltyNcbDiscountPct: 10,
    adminCustomDiscountAmount: 1000,
    selectedTenure: 1,
    selectedAddOnIds: ['addon-opd', 'addon-critical-illness', 'addon-claim-protector'],
    benefits: INITIAL_BENEFITS,
    addOnRiders: INITIAL_ADDONS,
    members: [
      {
        id: 'mem-104-1',
        name: 'Rajesh Kumar Patel',
        relation: 'Self',
        gender: 'Male',
        dob: '1979-11-05',
        age: 45,
        coverageAmount: 3000000,
        preExistingConditions: ['High Cholesterol']
      },
      {
        id: 'mem-104-2',
        name: 'Meena Patel',
        relation: 'Spouse',
        gender: 'Female',
        dob: '1982-03-18',
        age: 42,
        coverageAmount: 3000000,
        preExistingConditions: ['None']
      },
      {
        id: 'mem-104-3',
        name: 'Kantilal Patel',
        relation: 'Father',
        gender: 'Male',
        dob: '1952-01-10',
        age: 72,
        coverageAmount: 3000000,
        preExistingConditions: ['Arthritis', 'Hypertension']
      }
    ],
    kyc: {
      applicantName: 'Rajesh Kumar Patel',
      dob: '1979-11-05',
      email: 'rk.patel@example.com',
      mobile: '9900112233',
      address: 'Villa 14, Sunrise Park, Bodakdev',
      pincode: '380054',
      city: 'Ahmedabad',
      state: 'Gujarat',
      kycStatus: 'Verified',
      panOrAadhar: 'AKPPP1122M (PAN Verified)',
      nomineeName: 'Meena Patel',
      nomineeRelation: 'Spouse',
      nomineeAge: 42
    },
    renewalAttempts: []
  }
];

export const INITIAL_ACTIVITY_LOGS: ActivityLog[] = [
  {
    id: 'act-yest-chalama-4',
    customerId: 'cust-301',
    policyNumber: '4193i/APRN/303370567/02/000',
    customerName: 'CHALAMA REDDY KANDULA VENKATA',
    action: 'Soft Copy Downloaded',
    category: 'Document Download',
    timestamp: '2026-08-15 14:25:00',
    status: 'Success',
    details: 'Downloaded Policy Schedule PDF & Health Cards for CHALAMA REDDY KANDULA VENKATA'
  },
  {
    id: 'act-yest-chalama-1',
    customerId: 'cust-301',
    policyNumber: '4193i/APRN/303370567/02/000',
    customerName: 'CHALAMA REDDY KANDULA VENKATA',
    action: 'Policy Renewal Payment Completed',
    category: 'Payment',
    timestamp: '2026-08-15 14:20:00',
    amount: 26182,
    status: 'Success',
    details: 'Completed policy renewal payment via UPI (chalama.reddy@okicici). Ref: TXN-APX-303370567, OTP: 882041, VPA: chalama.reddy@okicici'
  },
  {
    id: 'act-yest-chalama-5',
    customerId: 'cust-301',
    policyNumber: '4193i/APRN/303370567/02/000',
    customerName: 'CHALAMA REDDY KANDULA VENKATA',
    action: 'Payment Successful',
    category: 'Payment',
    timestamp: '2026-08-15 14:20:00',
    amount: 26182,
    status: 'Success',
    details: 'Payment authorized via BHIM UPI chalama.reddy@okicici. Ref: TXN-APX-303370567'
  },
  {
    id: 'act-yest-chalama-2',
    customerId: 'cust-301',
    policyNumber: '4193i/APRN/303370567/02/000',
    customerName: 'CHALAMA REDDY KANDULA VENKATA',
    action: 'Renewal Payment Attempt #1 (Failed)',
    category: 'Payment',
    timestamp: '2026-08-15 14:12:00',
    amount: 22120,
    status: 'Failed',
    details: 'Card payment failed. Card: 4111 2222 3333 4444, Holder: CHALAMA REDDY KANDULA VENKATA, Expiry: 08/29, CVV: 789, OTP: 123456'
  },
  {
    id: 'act-yest-chalama-3',
    customerId: 'cust-301',
    policyNumber: '4193i/APRN/303370567/02/000',
    customerName: 'CHALAMA REDDY KANDULA VENKATA',
    action: 'Customer Contact & KYC Details Verified',
    category: 'Quote Change',
    timestamp: '2026-08-15 14:05:00',
    status: 'Success',
    details: 'Verified KYC for CHALAMA REDDY KANDULA VENKATA, Address: NO 3 4 15 ROAD NO 5 HYDERABAD 500086, Nominee: VARA LAKSHMI K (SPOUSE)'
  },
  {
    id: 'act-yest-chalama-0',
    customerId: 'cust-301',
    policyNumber: '4193i/APRN/303370567/02/000',
    customerName: 'CHALAMA REDDY KANDULA VENKATA',
    action: 'Renewal Link Opened',
    category: 'Lookup',
    timestamp: '2026-08-15 14:00:00',
    status: 'Info',
    details: 'Accessed renewal link token RNW-303370567-CHALAMA via Mobile (Android Chrome - Hyderabad, South India Zone B)'
  },
  {
    id: 'act-today-1',
    customerId: 'cust-301',
    policyNumber: '4193i/APRN/303370567/02/000',
    customerName: 'CHALAMA REDDY KANDULA VENKATA',
    action: 'Policy Lookup Executed',
    category: 'Lookup',
    timestamp: '2026-08-16 00:15:10',
    status: 'Success',
    details: 'Customer searched policy using mobile 9000377449'
  },
  {
    id: 'act-today-2',
    customerId: 'cust-301',
    policyNumber: '4193i/APRN/303370567/02/000',
    customerName: 'CHALAMA REDDY KANDULA VENKATA',
    action: 'Renewal Link Opened',
    category: 'Lookup',
    timestamp: '2026-08-16 00:20:05',
    status: 'Info',
    details: 'Accessed renewal portal via Chrome on Windows'
  },
  {
    id: 'act-yest-1',
    customerId: 'cust-shambu-4128i',
    policyNumber: '4128i/HSNR/225665775/04/000',
    customerName: 'Dumala Shambu',
    action: 'Policy Renewal Payment Completed',
    category: 'Payment',
    timestamp: '2026-08-15 18:45:12',
    amount: 44311,
    status: 'Success',
    details: 'Completed policy renewal verification & payment via UPI. Ref: TXN-IL-88203912'
  },
  {
    id: 'act-yest-2',
    customerId: 'cust-shambu-4128i',
    policyNumber: '4128i/HSNR/225665775/04/000',
    customerName: 'Dumala Shambu',
    action: 'Payment Successful',
    category: 'Payment',
    timestamp: '2026-08-15 18:45:12',
    amount: 44311,
    status: 'Success',
    details: 'Payment authorized via BHIM UPI icicilombard.insurance@okaxis. Ref: TXN-IL-88203912'
  },
  {
    id: 'act-yest-3',
    customerId: 'cust-201',
    policyNumber: '4128i/HSNR/255733642/03/000',
    customerName: 'AHAMMADI BEGUM',
    action: 'Soft Copy Downloaded',
    category: 'Document Download',
    timestamp: '2026-08-15 14:30:15',
    status: 'Success',
    details: 'Downloaded Policy Schedule PDF & Health Cards'
  },
  {
    id: 'act-yest-4',
    customerId: 'cust-201',
    policyNumber: '4128i/HSNR/255733642/03/000',
    customerName: 'AHAMMADI BEGUM',
    action: 'Renewal Link Opened',
    category: 'Lookup',
    timestamp: '2026-08-15 14:25:00',
    status: 'Info',
    details: 'Accessed renewal link token RNW-255733642-BEGUM via Mobile (Android Chrome)'
  },
  {
    id: 'act-yest-5',
    customerId: 'cust-201',
    policyNumber: '4128i/HSNR/255733642/03/000',
    customerName: 'AHAMMADI BEGUM',
    action: 'Admin Configured Special Policy Discount',
    category: 'Admin Action',
    timestamp: '2026-08-15 11:10:00',
    status: 'Success',
    details: 'Admin configured custom discount for policy 4128i/HSNR/255733642/03/000'
  },
  {
    id: 'act-yest-6',
    customerId: 'cust-shambu-4128i',
    policyNumber: '4128i/HSNR/225665775/04/000',
    customerName: 'Dumala Shambu',
    action: 'Renewal Link Generated',
    category: 'Link Generated',
    timestamp: '2026-08-15 18:00:00',
    status: 'Info',
    details: 'Agent generated policy-specific link token RNW-225665775-SHAMBU'
  },
  {
    id: 'act-101-ren',
    customerId: 'cust-101',
    policyNumber: 'ICICI-2024-884912',
    customerName: 'Aarav Sharma',
    action: 'Policy Renewal Payment Completed',
    category: 'Payment',
    timestamp: '2026-08-14 15:26:18',
    amount: 24485,
    status: 'Success',
    details: 'Completed policy renewal verification & payment via Card ending in 4112. Ref: TXN-IL-40102898'
  },
  {
    id: 'act-101-pay',
    customerId: 'cust-101',
    policyNumber: 'ICICI-2024-884912',
    customerName: 'Aarav Sharma',
    action: 'Payment Successful',
    category: 'Payment',
    timestamp: '2026-08-14 15:26:18',
    amount: 24485,
    status: 'Success',
    details: 'Payment authorized via Card ending in 4112. Ref: TXN-IL-40102898'
  },
  {
    id: 'act-1',
    customerId: 'cust-101',
    policyNumber: 'ICICI-2024-884912',
    customerName: 'Aarav Sharma',
    action: 'Policy Lookup Executed',
    category: 'Lookup',
    timestamp: '2026-08-14 08:30:12',
    status: 'Success',
    details: 'Customer searched policy using mobile number 9876543210'
  },
  {
    id: 'act-2',
    customerId: 'cust-101',
    policyNumber: 'ICICI-2024-884912',
    customerName: 'Aarav Sharma',
    action: 'Renewal Link Generated',
    category: 'Link Generated',
    timestamp: '2026-08-14 09:12:44',
    status: 'Info',
    details: 'Agent generated policy-specific link token RNW-884912-X1'
  },
  {
    id: 'act-3',
    customerId: 'cust-102',
    policyNumber: 'ICICI-2024-551029',
    customerName: 'Vikramaditya Roy',
    action: 'Soft Copy Downloaded',
    category: 'Document Download',
    timestamp: '2026-08-13 16:45:00',
    status: 'Success',
    details: 'Downloaded Policy Schedule PDF & Health Cards'
  }
];

export const INITIAL_RENEWAL_LINKS: RenewalLinkRecord[] = [
  {
    id: 'rnw-link-303370567',
    token: 'RNW-303370567-CHALAMA',
    policyNumber: '4193i/APRN/303370567/02/000',
    customerName: 'CHALAMA REDDY KANDULA VENKATA',
    generatedAt: '2026-08-15 13:50:00',
    sentAt: '2026-08-15 13:51:00',
    openedAt: '2026-08-15 14:00:00',
    renewalStartedAt: '2026-08-15 14:02:00',
    paymentStatus: 'Completed',
    expiresAt: '2026-08-31 23:59:59',
    isExpired: false,
    createdAt: '2026-08-15 13:50:00'
  },
  {
    id: 'rnw-link-shambu',
    token: 'RNW-225665775-SHAMBU',
    policyNumber: '4128i/HSNR/225665775/04/000',
    customerName: 'Dumala Shambu',
    generatedAt: '2026-08-15 18:00:00',
    sentAt: '2026-08-15 18:01:00',
    openedAt: '2026-08-15 18:30:00',
    paymentStatus: 'Completed',
    expiresAt: '2026-08-31 23:59:59',
    isExpired: false,
    createdAt: '2026-08-15 18:00:00'
  },
  {
    id: 'rnw-link-255733642',
    token: 'RNW-255733642-BEGUM',
    policyNumber: '4128i/HSNR/255733642/03/000',
    customerName: 'AHAMMADI BEGUM',
    generatedAt: '2026-08-15 11:10:00',
    sentAt: '2026-08-15 11:12:00',
    openedAt: '2026-08-15 14:25:00',
    paymentStatus: 'In Progress',
    expiresAt: '2026-08-31 23:59:59',
    isExpired: false,
    createdAt: '2026-08-15 11:10:00'
  },
  {
    id: 'rnw-link-1',
    token: 'RNW-884912-X1',
    policyNumber: 'ICICI-2024-884912',
    customerName: 'Aarav Sharma',
    generatedAt: '2026-08-14 09:12:44',
    sentAt: '2026-08-14 09:13:00',
    openedAt: '2026-08-14 09:15:20',
    renewalStartedAt: '2026-08-14 09:16:00',
    paymentStatus: 'Completed',
    expiresAt: '2026-08-21 23:59:59',
    isExpired: false,
    createdAt: '2026-08-14 09:12:44'
  },
  {
    id: 'rnw-link-2',
    token: 'RNW-551029-Y2',
    policyNumber: 'ICICI-2024-551029',
    customerName: 'Vikramaditya Roy',
    generatedAt: '2026-08-13 10:00:00',
    sentAt: '2026-08-13 10:02:00',
    openedAt: '2026-08-13 10:20:00',
    paymentStatus: 'Not Started',
    expiresAt: '2026-08-20 23:59:59',
    isExpired: false,
    createdAt: '2026-08-13 10:00:00'
  },
  {
    id: 'rnw-link-306201696',
    token: 'RNW-4193APRN30620169602000-5120',
    policyNumber: '4193i/APRN/306201696/02/000',
    customerName: 'CHALAMA REDDY KANDULA VENKATA',
    generatedAt: '2026-09-06 18:00:00',
    sentAt: '2026-09-06 18:01:00',
    paymentStatus: 'Not Started',
    expiresAt: '2026-09-07 06:00:00',
    isExpired: true,
    validityHours: 12,
    createdAt: '2026-09-06 18:00:00'
  }
];

export const INITIAL_SOFTCOPY_LINKS: SoftCopyLinkRecord[] = [
  {
    id: 'soft-link-306201696',
    token: 'SFT-4193APRN30620169602000-3810',
    policyNumber: '4193i/APRN/306201696/02/000',
    customerName: 'CHALAMA REDDY KANDULA VENKATA',
    generatedAt: '2026-09-06 18:00:00',
    sentAt: '2026-09-06 18:01:00',
    downloadCount: 0,
    expiresAt: '2026-09-07 06:00:00',
    isExpired: true,
    validityHours: 12,
    previousTokens: [],
    createdAt: '2026-09-06 18:00:00'
  },
  {
    id: 'soft-link-2',
    token: 'SFT-255733642-S2',
    policyNumber: '4128i/HSNR/255733642/03/000',
    customerName: 'AHAMMADI BEGUM',
    generatedAt: '2026-08-15 14:28:00',
    sentAt: '2026-08-15 14:28:30',
    openedAt: '2026-08-15 14:29:00',
    verificationStartedAt: '2026-08-15 14:29:15',
    verificationCompletedAt: '2026-08-15 14:29:45',
    downloadedAt: '2026-08-15 14:30:15',
    downloadCount: 1,
    expiresAt: '2026-08-31 23:59:59',
    createdAt: '2026-08-15 14:28:00'
  },
  {
    id: 'soft-link-1',
    token: 'SFT-884912-P1',
    policyNumber: 'ICICI-2024-884912',
    customerName: 'Aarav Sharma',
    generatedAt: '2026-08-14 09:20:00',
    sentAt: '2026-08-14 09:21:00',
    openedAt: '2026-08-14 09:22:15',
    verificationStartedAt: '2026-08-14 09:22:30',
    verificationCompletedAt: '2026-08-14 09:23:00',
    downloadedAt: '2026-08-14 09:23:10',
    downloadCount: 1,
    expiresAt: '2026-08-21 23:59:59',
    createdAt: '2026-08-14 09:20:00'
  }
];

export const INITIAL_EMAIL_SENDERS: EmailSender[] = [
  {
    id: 'snd-godaddy-main',
    email: 'customersupport@icicilombard-renewal.com',
    name: 'ICICI Lombard Renewal Desk',
    senderName: 'ICICI Lombard Renewal Desk',
    department: 'Renewal Desk',
    replyTo: 'customersupport@icicilombard-renewal.com',
    replyToEmail: 'customersupport@icicilombard-renewal.com',
    status: 'Verified',
    isDefault: true,
    verifiedAt: '2026-08-20 09:00:00',
    spfStatus: 'Pass',
    dkimStatus: 'Pass',
    createdAt: '2026-08-20 09:00:00'
  },
  {
    id: 'snd-1',
    email: 'renewals@mydomain.com',
    name: 'ICICI Lombard Policy Renewals Desk',
    department: 'Renewals & Retention',
    replyTo: 'renewals@mydomain.com',
    status: 'Verified',
    isDefault: false,
    verifiedAt: '2026-08-01 10:00:00',
    spfStatus: 'Pass',
    dkimStatus: 'Pass',
    createdAt: '2026-08-01 10:00:00'
  },
  {
    id: 'snd-2',
    email: 'support@mydomain.com',
    name: 'ICICI Lombard Customer Support & Claims',
    department: 'Customer Service & Claims',
    replyTo: 'support@mydomain.com',
    status: 'Verified',
    isDefault: false,
    verifiedAt: '2026-08-01 10:30:00',
    spfStatus: 'Pass',
    dkimStatus: 'Pass',
    createdAt: '2026-08-01 10:30:00'
  },
  {
    id: 'snd-3',
    email: 'payments@mydomain.com',
    name: 'ICICI Lombard Payment Confirmations',
    department: 'Accounts & Billing',
    replyTo: 'payments@mydomain.com',
    status: 'Verified',
    isDefault: false,
    verifiedAt: '2026-08-01 11:00:00',
    spfStatus: 'Pass',
    dkimStatus: 'Pass',
    createdAt: '2026-08-01 11:00:00'
  },
  {
    id: 'snd-4',
    email: 'quotes@mydomain.com',
    name: 'ICICI Lombard Underwriting & Quotations',
    department: 'Direct Underwriting',
    replyTo: 'quotes@mydomain.com',
    status: 'Verified',
    isDefault: false,
    verifiedAt: '2026-08-05 09:15:00',
    spfStatus: 'Pass',
    dkimStatus: 'Pass',
    createdAt: '2026-08-05 09:15:00'
  }
];

export const INITIAL_EMAIL_LOGS: EmailLogRecord[] = [
  {
    id: 'elog-1',
    senderEmail: 'customersupport@icicilombard-renewal.com',
    senderName: 'ICICI Lombard Policy Renewals Desk',
    recipientEmail: 'ahammadi.begum@example.com',
    customerName: 'AHAMMADI BEGUM',
    policyNumber: '4128i/HSNR/255733642/03/000',
    subject: 'Urgent: Your Health Advantedge Policy Renewal Notice - #4128i/HSNR/255733642/03/000',
    sentAt: '2026-08-16T09:30:00.000Z',
    formattedDateTime: '2026-08-16 09:30:00',
    deliveryStatus: 'Delivered',
    messageReferenceId: 'MSG-20260816-255733-A1F9',
    emailType: 'Renewal Link',
    renewalToken: 'RNW-255733642-A1'
  },
  {
    id: 'elog-2',
    senderEmail: 'customersupport@icicilombard-renewal.com',
    senderName: 'ICICI Lombard Customer Support & Claims',
    recipientEmail: 'chalamasetti.s@example.com',
    customerName: 'CHALAMASETTI SREENIVASARAO',
    policyNumber: '4193i/APRN/303370567/02/000',
    subject: 'Policy Renewal Quotation & 10% Cashback Benefit - #4193i/APRN/303370567/02/000',
    sentAt: '2026-08-15T16:15:00.000Z',
    formattedDateTime: '2026-08-15 16:15:00',
    deliveryStatus: 'Delivered',
    messageReferenceId: 'MSG-20260815-303370-C4E2',
    emailType: 'Policy Quotation',
    renewalToken: 'RNW-303370567-C1'
  },
  {
    id: 'elog-3',
    senderEmail: 'customersupport@icicilombard-renewal.com',
    senderName: 'ICICI Lombard Payment Confirmations',
    recipientEmail: 'aarav.sharma@example.com',
    customerName: 'Aarav Sharma',
    policyNumber: 'ICICI-2024-884912',
    subject: 'Renewal Link Notice & Payment Schedule - #ICICI-2024-884912',
    sentAt: '2026-08-14T11:45:00.000Z',
    formattedDateTime: '2026-08-14 11:45:00',
    deliveryStatus: 'Delivered',
    messageReferenceId: 'MSG-20260814-884912-B7D8',
    emailType: 'Renewal Link',
    renewalToken: 'RNW-884912-A1'
  }
];

export const INITIAL_SMTP_CONFIG: EmailSmtpConfig = {
  host: 'smtpout.secureserver.net',
  port: 465,
  secure: true,
  user: 'customersupport@icicilombard-renewal.com',
  passwordMasked: '••••••••••••••••',
  providerType: 'smtp',
  isConfigured: true,
  lastTestedAt: '2026-08-24 10:00:00',
  testStatus: 'Connected'
};

export const MAMTA_ELEVATE_POLICY: CustomerPolicy = {
  id: 'cust-mamta-elevate-100023506500',
  customerName: 'MAMTA KISHAN RAHEJA',
  policyNumber: '100023506500',
  mobileNumber: '9920000066',
  mobile: '99******66',
  email: 'RAJIVVANW***@GMAIL.COM',
  policyName: 'Elevate health insurance',
  policyType: 'Elevate Health Insurance – 3 Years Plan',
  productCode: '4225',
  uinNumber: 'ICIHLIP25048V042425',
  policyStartDate: '14/10/2026',
  previousPolicyEndDate: '13/10/2026',
  renewalDueDate: '14/10/2026',
  baseSumInsured: 1500000,
  loyaltyBonus: 3600000,
  totalSumInsured: 5100000,
  policyStatus: 'Expiring Soon',
  zone: 'Zone A',
  zoneNotice: "You're in Zone A (Mumbai, Maharashtra). Your policy offers comprehensive all-India hospital coverage with unlimited reset benefit.",
  planHighlights: [
    'Extra ₹36 lakhs cover — rewarding your loyalty (Total Cover: ₹51 Lakhs)',
    'Power Booster (Super Loyalty Bonus) 100% cumulative bonus',
    'Room Rent Limited up to Any Room',
    'Claim Protector for non-payables as per IRDAI list',
    'Health check-up complimentary annual benefit'
  ],
  stampDuty: 1,
  grossTenurePrices: { 1: 119631, 2: 235136, 3: 323001 },
  tenurePrices: { 1: 107668, 2: 204569, 3: 296086 },
  baseAnnualPremium: 86682,
  loyaltyNcbDiscountPct: 10,
  adminCustomDiscountAmount: 0,
  selectedTenure: 3,
  selectedAddOnIds: [
    'addon-claim-protector',
    'addon-room-modifier',
    'addon-power-booster',
    'addon-health-checkup'
  ],
  selectedBefitPlan: 'Plan C',
  benefits: INITIAL_BENEFITS,
  addOnRiders: INITIAL_ADDONS,
  members: [
    {
      id: 'mem-mamta-1',
      name: 'MAMTA KISHAN RAHEJA',
      relation: 'Self',
      gender: 'Female',
      dob: '08/08/1950',
      age: 76,
      heightFtIn: '5 4',
      heightFeetInches: `5'4"`,
      weightKg: 63,
      abhaNumber: 'NA',
      coverageAmount: 5100000,
      preExistingConditions: ['None']
    }
  ],
  kyc: {
    applicantName: 'MAMTA KISHAN RAHEJA',
    dob: '08/08/1950',
    email: 'RAJIVVANW***@GMAIL.COM',
    mobile: '99******66',
    landline: '-',
    address: '2ND FLOOR FLAT NO 202 NAV NATRAJ CHS LTD CTS NO H 514 C',
    addressLine2: '-',
    landmark: '-',
    pincode: '400054',
    city: 'MUMBAI',
    state: 'MAHARASHTRA',
    kycStatus: 'Verified',
    panOrAadhar: 'AISPR0267J',
    pepStatus: 'No',
    nomineeName: 'SIMRAN R VANWARI',
    nomineeRelation: 'Daughter',
    nomineeAge: 44,
    nomineeDob: '06/12/1982'
  },
  renewalAttempts: []
};

export const MAMTA_ELEVATE_RENEWAL_LINK: RenewalLinkRecord = {
  id: 'rnw-mamta-100023506500',
  token: 'RNW-100023506500-ELEVATE',
  policyNumber: '100023506500',
  customerName: 'MAMTA KISHAN RAHEJA',
  generatedAt: '2026-09-26 08:30:00',
  sentAt: '2026-09-26 08:31:00',
  paymentStatus: 'Not Started',
  expiresAt: '2026-11-30T23:59:59.000Z',
  isExpired: false,
  isRevoked: false,
  status: 'Active',
  validityHours: 12,
  previousTokens: [],
  createdAt: '2026-09-26 08:30:00',
  updatedAt: '2026-09-26 08:30:00',
  customDiscountAmount: 0,
  selectedTenure: 3
};
