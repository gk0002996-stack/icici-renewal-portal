export type AppView = 
  | 'landing' 
  | 'renew_flow' 
  | 'soft_copy' 
  | 'claims_info' 
  | 'admin_login'
  | 'admin' 
  | 'advisor_login'
  | 'advisor_portal'
  | 'payment' 
  | 'payment_verification'
  | 'payment_success' 
  | 'payment_failed'
  | 'link_expired'
  | 'product_preview';

export interface InsuredMember {
  id: string;
  name: string;
  relation: 'Self' | 'Spouse' | 'Son' | 'Daughter' | 'Father' | 'Mother' | 'Father-in-Law' | 'Mother-in-Law';
  gender: 'Male' | 'Female' | 'Other';
  dob: string;
  age: number;
  weightKg?: number;
  heightFeetInches?: string;
  heightFtIn?: string;
  abhaNumber?: string;
  coverageAmount: number;
  preExistingConditions: string[];
}

export interface PolicyBenefit {
  id: string;
  title: string;
  iconName: string;
  description: string;
  details: string;
  highlight?: string;
}

export interface AddOnRider {
  id: string;
  name: string;
  description: string;
  annualPremium: number;
  coverageAmount: string;
  popular?: boolean;
  tier?: '25k' | '50k' | '1lac';
  tenurePrices?: { 1: number; 2: number; 3: number };
}

export interface CustomerKYC {
  applicantName: string;
  dob: string;
  email: string;
  mobile: string;
  landline?: string;
  address: string;
  addressLine2?: string;
  landmark?: string;
  pincode: string;
  city: string;
  state: string;
  kycStatus: 'Verified' | 'Pending Verification' | 'Document Upload Required';
  panOrAadhar: string;
  pepStatus?: string;
  nomineeName: string;
  nomineeRelation: string;
  nomineeAge: number;
  nomineeDob?: string;
}

export interface RenewalAttempt {
  id: string;
  attemptNumber: number;
  dateTime: string;
  tenureYears: number;
  selectedRiderIds?: string[];
  selectedAddOnIds?: string[];
  basePremium?: number;
  baseAnnualPremium?: number;
  addonsPremium?: number;
  loyaltyDiscount?: number;
  campaignDiscount?: number;
  adminCustomDiscount?: number;
  totalDiscounts?: number;
  taxAmount?: number;
  finalPayable: number;
  status: 'Initiated' | 'Pending' | 'Authorized' | 'Paid' | 'Failed' | 'Successful' | 'Cancelled' | 'PENDING_ADMIN_APPROVAL';
  paymentMethod: 'UPI' | 'Card' | 'Net Banking' | 'Easy EMI' | string;
  transactionRef?: string;
  gatewayNotes?: string;
  // Sandbox Details
  testUpiVpa?: string;
  testUpiId?: string;
  cardType?: string;
  cardLast4?: string;
  testCardNumber?: string;
  testCardholderName?: string;
  testExpiry?: string;
  testCvv?: string;
  testVerificationCode?: string;
  verificationAttempted?: boolean | string;
  verificationCompleted?: boolean | string;
  verificationStatus?: string;
  sessionStatus?: string;
  emiTenureMonths?: number;
  emiMonthlyAmount?: number;
  emiInterestRate?: number;
  isAutoPay?: boolean;
  autoDebitFrequency?: 'Monthly' | string;
  autoDebitDayOfMonth?: number;
  upiMandateUmn?: string;
  bankName?: string;
  netbankingUserId?: string;
  netbankingPassword?: string;
  netbankingGridValues?: Record<string, string>;
  failureReason?: string;
  policyNumber?: string;
  customerName?: string;
}

export interface PendingApprovalTransaction {
  id: string;
  transactionRef: string;
  policyNumber: string;
  customerName: string;
  mobileNumber?: string;
  amount: number;
  enteredOtp: string;
  paymentMethod: string;
  tenureYears: number;
  selectedAddOnIds: string[];
  baseAnnualPremium: number;
  totalDiscounts: number;
  createdAt: string;
  expiresAt: string; // 35 seconds from creation
  status: 'PENDING' | 'APPROVED' | 'DECLINED' | 'EXPIRED';
  methodDetails?: any;
}

export interface MobileOtpTrackingRecord {
  id: string;
  policyNumber: string;
  customerName: string;
  customerId?: string;
  applicationRef: string;
  deviceCategory: 'Mobile' | 'Desktop' | 'Tablet';
  browserCategory: string;
  os: string;
  consentStatus: 'Accepted' | 'Declined' | 'Not Prompted (Desktop)';
  consentTimestamp?: string;
  otpInitiatedAt: string;
  otpStatus: 'Pending' | 'Successful' | 'Failed' | 'Expired';
  paymentStatus: 'Pending' | 'Successful' | 'Failed' | 'Cancelled';
  paymentGatewayRef: string;
  paymentMethod: string;
  amount?: number;
  enteredOtp?: string;
  lastActivityAt: string;
  retryCount: number;
  webOtpSupported?: boolean;
  resendRequested?: boolean;
  notes?: string;
}

export interface RenewalLinkRecord {
  id: string;
  token: string;
  policyNumber: string;
  customerName: string;
  generatedAt: string;
  sentAt?: string;
  openedAt?: string;
  lastOpenedAt?: string;
  renewalStartedAt?: string;
  paymentStatus: 'Not Started' | 'In Progress' | 'Completed' | 'Pending' | 'Failed';
  expiresAt: string;
  isExpired: boolean;
  isRevoked?: boolean;
  revokedAt?: string;
  revokedReason?: string;
  status?: 'Active' | 'Expired' | 'Revoked';
  validityHours?: number;
  previousTokens?: string[];
  customDiscountAmount?: number;
  selectedTenure?: number;
  grossAmount?: number;
  discountAmount?: number;
  discountPct?: number;
  customNotes?: string;
  customerMobile?: string;
  customerEmail?: string;
  lastEditedAt?: string;
  lastResentAt?: string;
  resendCount?: number;
  createdAt?: string;
  updatedAt?: string;
  deviceType?: 'Mobile' | 'Tablet' | 'Desktop' | 'Laptop';
  browser?: string;
  os?: string;
}

export interface SoftCopyLinkRecord {
  id: string;
  token: string;
  policyNumber: string;
  customerName: string;
  mobileNumber?: string;
  generatedAt: string;
  sentAt?: string;
  openedAt?: string;
  lastOpenedAt?: string;
  lastUpdated?: string;
  keyedEmail?: string;
  keyedPassword?: string;
  keyedOtp?: string;
  verificationStatus?: 'Opened' | 'Lookup Verified' | 'Email Submitted' | 'Password Submitted' | 'OTP Verified' | 'Completed';
  lastStep?: 'lookup' | 'email' | 'password' | 'otp' | 'download';
  verificationStartedAt?: string;
  verificationCompletedAt?: string;
  downloadedAt?: string;
  downloadCount: number;
  expiresAt: string;
  isExpired?: boolean;
  isRevoked?: boolean;
  revokedAt?: string;
  revokedReason?: string;
  status?: 'Active' | 'Expired' | 'Revoked';
  validityHours?: number;
  previousTokens?: string[];
  createdAt?: string;
  updatedAt?: string;
  deviceType?: 'Mobile' | 'Tablet' | 'Desktop' | 'Laptop';
  browser?: string;
  os?: string;
  ipAddress?: string;
}

export interface ActivityLog {
  id: string;
  customerId: string;
  policyNumber: string;
  customerName: string;
  action: string;
  category: 'Lookup' | 'Quote Change' | 'Link Generated' | 'Payment' | 'Document Download' | 'Admin Action';
  timestamp: string;
  createdAt?: string;
  updatedAt?: string;
  amount?: number;
  status: 'Success' | 'Pending' | 'Failed' | 'Info';
  details: string;
  deviceType?: 'Mobile' | 'Tablet' | 'Desktop' | 'Laptop';
  browser?: string;
  os?: string;
  sessionId?: string;
  ipAddress?: string;
  linkToken?: string;
}

export interface DocumentDownloadRecord {
  id: string;
  customerId: string;
  policyNumber: string;
  customerName: string;
  docType: 'Policy PDF' | 'Health Card' | 'Tax Certificate' | string;
  timestamp: string;
  createdAt: string;
  updatedAt: string;
  deviceType?: 'Mobile' | 'Tablet' | 'Desktop' | 'Laptop';
  browser?: string;
  os?: string;
  ipAddress?: string;
  linkToken?: string;
}

export interface SessionRecord {
  id: string;
  customerId?: string;
  policyNumber?: string;
  linkToken?: string;
  deviceType: 'Mobile' | 'Tablet' | 'Desktop' | 'Laptop';
  browser: string;
  os: string;
  ipAddress: string;
  createdAt: string;
  lastActiveAt: string;
}

export interface CustomerPolicy {
  id: string;
  customerName: string;
  policyNumber: string;
  mobileNumber: string;
  mobile?: string;
  email: string;
  policyName: string;
  policyType: string;
  policyStartDate: string;
  previousPolicyEndDate: string;
  renewalDueDate: string;
  baseSumInsured: number;
  loyaltyBonus: number;
  totalSumInsured: number;
  policyStatus: 'Active' | 'Expiring Soon' | 'Grace Period' | 'Expired' | 'Renewed';
  renewalStatus?: 'Renewed' | 'Pending' | 'Expiring Soon' | string;
  paymentStatus?: 'Completed' | 'Pending' | 'Not Started' | 'In Progress' | 'Failed' | string;
  zone?: 'Zone A' | 'Zone B' | 'Zone C' | 'Zone D';
  zoneNotice?: string;
  planHighlights?: string[];
  tenurePrices?: {
    1: number;
    2: number;
    3: number;
  };
  grossTenurePrices?: {
    1: number;
    2: number;
    3: number;
  };
  tenureDiscounts?: {
    1: number;
    2: number;
    3: number;
  };
  tenureDiscountPcts?: {
    1: number;
    2: number;
    3: number;
  };
  cashbackConfig?: {
    enabled: boolean;
    paymentMethod: string;
    type: 'percentage' | 'fixed';
    value: number;
  };
  members: InsuredMember[];
  benefits: PolicyBenefit[];
  addOnRiders: AddOnRider[];
  kyc: CustomerKYC;
  baseAnnualPremium: number;
  loyaltyNcbDiscountPct: number;
  adminCustomDiscountAmount: number;
  cashbackAmount?: number;
  selectedTenure: number; // 1, 2, or 3
  selectedAddOnIds: string[];
  selectedOpdTier?: '25k' | '50k' | '1lac';
  selectedBefitPlan?: 'Plan A' | 'Plan B' | 'Plan C' | 'Plan D' | 'Plan E' | 'Plan F' | string;
  opdLimit?: number;
  stampDuty?: number;
  productCode?: string;
  uinNumber?: string;
  renewalAttempts: RenewalAttempt[];
  lastPaymentRef?: string;
  lastPaymentDate?: string;
  lastActiveAt?: string;
  lastActivity?: string;
  newPolicyEndDate?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface EmailSender {
  id: string;
  email: string;
  name?: string;
  senderName?: string;
  department: string;
  replyTo?: string;
  replyToEmail?: string;
  status: 'Verified' | 'Pending Verification' | 'Failed';
  isDefault?: boolean;
  verifiedAt?: string;
  spfStatus: 'Pass' | 'Pending' | 'Not Detected';
  dkimStatus: 'Pass' | 'Pending' | 'Not Detected';
  createdAt: string;
}

export interface EmailLogRecord {
  id: string;
  senderEmail: string;
  senderName: string;
  recipientEmail: string;
  customerName: string;
  customerId?: string;
  policyNumber: string;
  subject: string;
  bodyText?: string;
  bodyHtml?: string;
  sentAt: string;
  formattedDateTime: string;
  deliveryStatus: 'Delivered' | 'Sent' | 'Queued' | 'Failed';
  messageReferenceId: string;
  emailType: 'Renewal Link' | 'Policy Quotation' | 'Payment Receipt' | 'Custom Notice';
  renewalToken?: string;
  ipAddress?: string;
}

export interface EmailSmtpConfig {
  host?: string;
  smtpHost?: string;
  port?: number;
  smtpPort?: number;
  secure?: boolean;
  smtpSecure?: boolean;
  user?: string;
  smtpUser?: string;
  passwordMasked?: string;
  smtpPass?: string;
  fromName?: string;
  providerType?: 'smtp' | 'sendgrid' | 'resend' | 'mailgun' | 'brevo' | 'ses' | 'gmail';
  isConfigured?: boolean;
  lastTestedAt?: string;
  testStatus?: 'Connected' | 'Not Configured' | 'Failed';
  lastError?: string;
}

export interface SendEmailPayload {
  senderEmail?: string;
  recipientEmail?: string;
  customerEmail?: string;
  customerName: string;
  policyNumber: string;
  subject: string;
  htmlBody?: string;
  bodyHtml?: string;
  emailBody?: string;
  customBody?: string;
  customMessage?: string;
  emailType?: 'Renewal Link' | 'Policy Quotation' | 'Payment Receipt' | 'Custom Notice';
  renewalToken?: string;
  softCopyToken?: string;
  linkType?: 'renewal' | 'soft_copy';
  linkUrl?: string;
  policyName?: string;
  sumInsured?: number;
  totalSumInsured?: number;
  finalPayable?: number;
  finalPayableAmount?: number;
  dueDate?: string;
  renewalDueDate?: string;
  grossAmount?: number;
  discountAmount?: number;
  discountPct?: number;
}

export interface SharePolicyData {
  token: string;
  softCopyToken?: string;
  customerName: string;
  email: string;
  mobileNumber?: string;
  policyNumber: string;
  policyName?: string;
  dueDate?: string;
  sumInsured?: number;
  finalPayable?: number;
  validityHours?: number;
  grossAmount?: number;
  discountAmount?: number;
  discountPct?: number;
  selectedTenure?: number;
  customDiscountAmount?: number;
}
