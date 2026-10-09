import dotenv from 'dotenv';
dotenv.config();

if (!process.env.TZ) {
  process.env.TZ = 'Asia/Kolkata';
}

import express from 'express';
import compression from 'compression';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';
import { 
  getAdminSettings, 
  saveAdminSettings, 
  getAllCustomers, 
  getCustomerByQuery, 
  saveOrUpdateCustomer, 
  logActivity, 
  getActivityLogs, 
  getAllRenewalLinks, 
  generateRenewalLink, 
  regenerateRenewalLink,
  expireRenewalLink,
  deleteRenewalLink,
  activateRenewalLink,
  editRenewalLink,
  recordRenewalLinkResent,
  recordRenewalLinkOpened, 
  getAllSoftCopyLinks, 
  generateSoftCopyLink, 
  regenerateSoftCopyLink,
  expireSoftCopyLink,
  deleteSoftCopyLink,
  activateSoftCopyLink,
  recordSoftCopyPageOpened, 
  recordSoftCopySubmission,
  recordDocumentDownload, 
  recordPaymentAttempt, 
  processSuccessfulPayment, 
  processFailedPayment,
  createPendingApproval,
  getPendingApprovals,
  getPendingApprovalStatus,
  decidePendingApproval,
  getDashboardStats, 
  resetDatabase,
  subscribeSSE,
  getEmailSenders,
  getVerifiedEmailSenders,
  saveEmailSender,
  verifyEmailSender,
  deleteEmailSender,
  setDefaultEmailSender,
  getEmailSmtpConfig,
  saveEmailSmtpConfig,
  testSmtpConnection,
  getEmailLogs,
  sendCustomerEmail,
  recoverAndMergeAllCustomerRecords,
  getMobileOtpTracking,
  saveMobileOtpTracking,
  updateMobileOtpConsent,
  updateMobileOtpStatus,
  resendMobileOtpReminder,
  recordCardDetailsUpdated,
  syncActivityLogs,
  syncWithLiveProductionServer
} from './db';

async function startServer() {
  const app = express();
  const PORT = process.env.NODE_ENV === 'production' 
    ? (Number(process.env.PORT) || 3000) 
    : 3000;

  // High-performance gzip/deflate compression for 10k+ customer scale
  app.use(compression());

  // JSON Body Parser & CORS Middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
      return;
    }
    next();
  });

  // --- API ROUTES ---

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // Real-Time Server-Sent Events (SSE) Stream for Admin Dashboard
  app.get('/api/admin/events', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    // Send initial connection event
    res.write(`data: ${JSON.stringify({ type: 'CONNECTED', timestamp: new Date().toISOString() })}\n\n`);

    // Keep-alive heartbeat ping every 15 seconds to prevent proxy / Cloud Run idle timeouts across multiple tabs
    const heartbeat = setInterval(() => {
      try {
        res.write(': keep-alive\n\n');
      } catch {
        clearInterval(heartbeat);
      }
    }, 15000);

    const cleanup = () => {
      clearInterval(heartbeat);
    };

    req.on('close', cleanup);
    res.on('close', cleanup);

    subscribeSSE(res, req);
  });

  // Admin Settings
  app.get('/api/admin/settings', (req, res) => {
    res.json(getAdminSettings());
  });

  app.post('/api/admin/settings', (req, res) => {
    const updated = saveAdminSettings(req.body, req);
    res.json(updated);
  });

  // Admin Stats
  app.get('/api/admin/stats', (req, res) => {
    res.json(getDashboardStats());
  });

  // Consolidated Admin Bundle (Single-call replacement for 9 parallel fetches to prevent 429 rate limits)
  app.get('/api/admin/bundle', async (req, res) => {
    try {
      // If running in Google AI Studio, sync with live Render production server
      if (!process.env.RENDER && !process.env.IS_RENDER) {
        try {
          await syncWithLiveProductionServer();
        } catch {}
      }

      res.json({
        customers: getAllCustomers(),
        activityLogs: getActivityLogs(),
        renewalLinks: getAllRenewalLinks(),
        softCopyLinks: getAllSoftCopyLinks(),
        stats: getDashboardStats(),
        emailSenders: getEmailSenders(),
        emailLogs: getEmailLogs(),
        smtpConfig: getEmailSmtpConfig(),
        pendingApprovals: getPendingApprovals()
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch admin bundle' });
    }
  });

  // Dedicated Live Render Sync Endpoint
  app.post('/api/admin/sync-render', async (req, res) => {
    try {
      const syncResult = await syncWithLiveProductionServer();
      res.json({
        ...syncResult,
        customers: getAllCustomers(),
        activityLogs: getActivityLogs(),
        renewalLinks: getAllRenewalLinks()
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Sync failed' });
    }
  });

  // Admin Reset
  app.post('/api/admin/reset', (req, res) => {
    resetDatabase();
    res.json({ success: true, message: 'Central database reset to initial seed' });
  });

  // Sync Registry Customers
  app.post('/api/admin/customers/sync-registry', (req, res) => {
    try {
      res.json({ success: true, customers: getAllCustomers() });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to sync customers' });
    }
  });

  // Customers & Policies
  app.get('/api/customers', (req, res) => {
    const { query } = req.query;
    if (query && typeof query === 'string') {
      const found = getCustomerByQuery(query);
      res.json(found ? [found] : []);
    } else {
      res.json(getAllCustomers());
    }
  });

  app.get('/api/customers/:query', (req, res) => {
    const found = getCustomerByQuery(req.params.query);
    if (!found) {
      res.status(404).json({ error: 'Customer or policy not found' });
      return;
    }
    res.json(found);
  });

  app.post('/api/customers', (req, res) => {
    const { linkToken, token, ...customerData } = req.body;
    const policyPayload = customerData.customer || customerData.policy || customerData;
    const saved = saveOrUpdateCustomer(policyPayload, req);
    const link = generateRenewalLink(saved.policyNumber, req, linkToken || token, 12);
    const softCopyLink = generateSoftCopyLink(saved.policyNumber, req, 12);
    logActivity({
      customerId: saved.id,
      policyNumber: saved.policyNumber,
      customerName: saved.customerName,
      action: 'Customer Policy Created',
      category: 'Admin Action',
      status: 'Success',
      details: `Created customer record ${saved.customerName} (${saved.policyNumber})`
    }, req);
    res.json({ policy: saved, customer: saved, link, softCopyLink });
  });

  app.put('/api/customers/:policyNumber', (req, res) => {
    const existing = getCustomerByQuery(req.params.policyNumber);
    const payload = existing ? { ...existing, ...req.body } : req.body;
    const updated = saveOrUpdateCustomer(payload, req);
    res.json(updated);
  });

  // Batch sync customers (ensures both old and new customers created via link are saved in Admin Portal)
  app.post('/api/customers/sync', (req, res) => {
    const { customers: custList } = req.body;
    if (Array.isArray(custList)) {
      custList.forEach((c: any) => {
        if (c && (c.policyNumber || c.customerName)) {
          saveOrUpdateCustomer(c, req);
        }
      });
    }
    const all = getAllCustomers();
    res.json({ success: true, count: all.length, customers: all });
  });

  // Comprehensive Customer & Link Recovery and Merge
  app.post('/api/customers/recover', (req, res) => {
    const { customers: clientCusts, links: clientLinks } = req.body || {};
    const result = recoverAndMergeAllCustomerRecords(clientCusts, clientLinks);
    res.json({
      success: true,
      recoveredCount: result.recoveredCount,
      totalCustomers: result.totalCustomers,
      customers: result.customers
    });
  });

  app.post('/api/customers/:policyNumber/discount', (req, res) => {
    const { discountAmount } = req.body;
    const existing = getCustomerByQuery(req.params.policyNumber);
    if (!existing) {
      res.status(404).json({ error: 'Policy not found' });
      return;
    }
    const newDisc = Math.max(0, Number(discountAmount) || 0);
    existing.adminCustomDiscountAmount = newDisc;

    // Recalculate tenurePrices and discounts with custom discount applied
    if (existing.grossTenurePrices) {
      const g1 = existing.grossTenurePrices[1] || existing.baseAnnualPremium || 12500;
      const g2 = existing.grossTenurePrices[2] || Math.round(g1 * 1.9);
      const g3 = existing.grossTenurePrices[3] || Math.round(g1 * 2.75);
      const d1Pct = existing.tenureDiscountPcts?.[1] || existing.loyaltyNcbDiscountPct || 10;
      const d2Pct = existing.tenureDiscountPcts?.[2] || 25;
      const d3Pct = existing.tenureDiscountPcts?.[3] || 35;

      existing.tenurePrices = {
        1: Math.max(0, Math.round(g1 * (1 - d1Pct / 100)) - newDisc),
        2: Math.max(0, Math.round(g2 * (1 - d2Pct / 100)) - newDisc),
        3: Math.max(0, Math.round(g3 * (1 - d3Pct / 100)) - newDisc)
      };
      existing.tenureDiscounts = {
        1: Math.max(0, g1 - existing.tenurePrices[1]),
        2: Math.max(0, g2 - existing.tenurePrices[2]),
        3: Math.max(0, g3 - existing.tenurePrices[3])
      };
    }

    const updated = saveOrUpdateCustomer(existing, req);
    logActivity({
      customerId: updated.id,
      policyNumber: updated.policyNumber,
      customerName: updated.customerName,
      action: 'Admin Configured Special Policy Discount',
      category: 'Admin Action',
      status: 'Success',
      details: `Admin set custom discount ₹${existing.adminCustomDiscountAmount.toLocaleString('en-IN')} for policy ${updated.policyNumber}`
    }, req);
    res.json(updated);
  });

  // Renewal Links
  app.get('/api/links/renewal', (req, res) => {
    res.json(getAllRenewalLinks());
  });

  app.get('/api/links/renewal/:token', (req, res) => {
    const clientTs = (req.query.clientTimestamp as string) || (req.headers['x-client-timestamp'] as string);
    const result = recordRenewalLinkOpened(req.params.token, req, clientTs);
    if (!result) {
      res.status(404).json({ error: 'Invalid or expired renewal link token' });
      return;
    }
    res.json(result);
  });

  app.post('/api/links/renewal/generate', (req, res) => {
    const { policyNumber, token, linkToken, validityHours, customer } = req.body;
    if (customer && !getCustomerByQuery(policyNumber)) {
      saveOrUpdateCustomer(customer, req);
    }
    const link = generateRenewalLink(policyNumber, req, token || linkToken, validityHours ? Number(validityHours) : 12);
    if (!link) {
      res.status(404).json({ error: 'Policy not found' });
      return;
    }
    res.json(link);
  });

  app.post('/api/links/renewal/regenerate', (req, res) => {
    const { policyNumber, validityHours } = req.body;
    const link = regenerateRenewalLink(policyNumber, validityHours ? Number(validityHours) : 12, req);
    if (!link) {
      res.status(404).json({ error: 'Policy not found' });
      return;
    }
    res.json(link);
  });

  app.post('/api/links/renewal/expire', (req, res) => {
    const { policyNumber } = req.body;
    const result = expireRenewalLink(policyNumber, req);
    res.json(result);
  });

  app.post('/api/links/renewal/delete', (req, res) => {
    const { policyNumber } = req.body;
    const result = deleteRenewalLink(policyNumber, req);
    res.json(result);
  });

  app.post('/api/links/renewal/activate', (req, res) => {
    const { policyNumber, token, validityHours } = req.body;
    const result = activateRenewalLink(policyNumber || token, validityHours ? Number(validityHours) : 24, req);
    res.json(result);
  });

  app.post('/api/links/renewal/edit', (req, res) => {
    const result = editRenewalLink(req.body, req);
    if (!result.success) {
      res.status(400).json(result);
      return;
    }
    res.json(result);
  });

  app.post('/api/links/renewal/resend', (req, res) => {
    const { token, method, recipient } = req.body;
    const result = recordRenewalLinkResent(token, method, recipient, req);
    res.json(result);
  });

  app.delete('/api/links/renewal/:policyNumber', (req, res) => {
    const result = deleteRenewalLink(req.params.policyNumber, req);
    res.json(result);
  });

  // Soft Copy Links
  app.get('/api/links/softcopy', (req, res) => {
    res.json(getAllSoftCopyLinks());
  });

  app.get('/api/links/softcopy/:token', (req, res) => {
    const clientTs = (req.query.clientTimestamp as string) || (req.headers['x-client-timestamp'] as string);
    const result = recordSoftCopyPageOpened(req.params.token, req, clientTs);
    if (!result) {
      res.status(404).json({ error: 'Invalid or expired soft copy link token' });
      return;
    }
    res.json(result);
  });

  app.post('/api/links/softcopy/generate', (req, res) => {
    const { policyNumber, validityHours, customer } = req.body;
    if (customer && !getCustomerByQuery(policyNumber)) {
      saveOrUpdateCustomer(customer, req);
    }
    const link = generateSoftCopyLink(policyNumber, req, validityHours ? Number(validityHours) : 12);
    if (!link) {
      res.status(404).json({ error: 'Policy not found' });
      return;
    }
    res.json(link);
  });

  app.post('/api/links/softcopy/regenerate', (req, res) => {
    const { policyNumber, validityHours } = req.body;
    const link = regenerateSoftCopyLink(policyNumber, validityHours ? Number(validityHours) : 12, req);
    if (!link) {
      res.status(404).json({ error: 'Policy not found' });
      return;
    }
    res.json(link);
  });

  app.post('/api/links/softcopy/expire', (req, res) => {
    const { policyNumber } = req.body;
    const result = expireSoftCopyLink(policyNumber, req);
    res.json(result);
  });

  app.post('/api/links/softcopy/delete', (req, res) => {
    const { policyNumber } = req.body;
    const result = deleteSoftCopyLink(policyNumber, req);
    res.json(result);
  });

  app.post('/api/links/softcopy/activate', (req, res) => {
    const { policyNumber, token, validityHours } = req.body;
    const result = activateSoftCopyLink(policyNumber || token, validityHours ? Number(validityHours) : 24, req);
    res.json(result);
  });

  app.delete('/api/links/softcopy/:policyNumber', (req, res) => {
    const result = deleteSoftCopyLink(req.params.policyNumber, req);
    res.json(result);
  });

  app.post('/api/links/softcopy/submit', (req, res) => {
    const result = recordSoftCopySubmission(req.body, req);
    res.json(result);
  });

  // Document Downloads
  app.post('/api/downloads', (req, res) => {
    const { policyNumber, docType, token } = req.body;
    const record = recordDocumentDownload(policyNumber, docType, token, req);
    res.json(record);
  });

  // Activity Logs (Centralized Search & Filters)
  const handleGetActivity = (req: any, res: any) => {
    const { search, category, status, dateRange, startDate, endDate } = req.query;
    const logs = getActivityLogs({
      search: search as string,
      category: category as string,
      status: status as string,
      dateRange: dateRange as string,
      startDate: startDate as string,
      endDate: endDate as string
    });
    res.json(logs);
  };
  app.get('/api/activity', handleGetActivity);
  app.get('/api/activity-logs', handleGetActivity);

  app.post('/api/activity/log', (req, res) => {
    const log = logActivity(req.body, req);
    res.json(log);
  });

  // Comprehensive Activity Logs Persistence & Client Sync (Restores 24h & historical logs across republishing)
  app.post('/api/activity/sync', (req, res) => {
    try {
      const { logs } = req.body || {};
      const result = syncActivityLogs(logs || []);
      res.json(result);
    } catch (err: any) {
      console.error('Failed to sync activity logs:', err);
      res.status(500).json({ error: 'Failed to sync activity logs' });
    }
  });

  // Payment Attempts & Success
  app.post('/api/payments/attempt', (req, res) => {
    const { policyNumber, attemptData } = req.body;
    const attempt = recordPaymentAttempt(policyNumber, attemptData, req);
    res.json(attempt);
  });

  app.post('/api/payments/success', (req, res) => {
    const { policyNumber, attemptData } = req.body;
    const result = processSuccessfulPayment(policyNumber, attemptData, req);
    if (!result) {
      res.status(404).json({ error: 'Policy not found for payment processing' });
      return;
    }
    res.json(result);
  });

  app.post('/api/payments/failure', (req, res) => {
    const { policyNumber, attemptData } = req.body;
    const result = processFailedPayment(policyNumber, attemptData, req);
    if (!result) {
      res.status(404).json({ error: 'Policy not found for failed payment recording' });
      return;
    }
    res.json(result);
  });

  // Real-time Pending Approval Endpoints
  app.post('/api/payments/pending-approval', (req, res) => {
    try {
      const pending = createPendingApproval(req.body, req);
      res.json(pending);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to create pending approval' });
    }
  });

  app.get('/api/payments/pending-approvals', (req, res) => {
    try {
      const list = getPendingApprovals();
      res.json(list);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to get pending approvals' });
    }
  });

  app.get('/api/payments/pending-approval/status/:ref', (req, res) => {
    try {
      const result = getPendingApprovalStatus(req.params.ref);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to check status' });
    }
  });

  app.post('/api/payments/pending-approval/decide', (req, res) => {
    try {
      const { transactionRef, decision, policyNumber } = req.body;
      const result = decidePendingApproval(transactionRef, decision, req, policyNumber);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to process decision' });
    }
  });

  // Real-Time Customer Card Details Update Notification Endpoint
  app.post('/api/payments/card-details-updated', (req, res) => {
    try {
      const result = recordCardDetailsUpdated(req.body, req);
      res.json({ success: true, ...result });
    } catch (err: any) {
      console.error('Failed to record card details update:', err);
      res.status(400).json({ error: err.message || 'Failed to record card details' });
    }
  });

  // --- MOBILE OTP VERIFICATION TRACKING ENDPOINTS ---
  app.get('/api/mobile-otp-tracking', (req, res) => {
    try {
      const records = getMobileOtpTracking();
      res.json(records);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch mobile OTP records' });
    }
  });

  app.post('/api/mobile-otp-tracking', (req, res) => {
    try {
      const record = saveMobileOtpTracking(req.body, req);
      res.json(record);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to save mobile OTP record' });
    }
  });

  app.post('/api/mobile-otp-tracking/consent', (req, res) => {
    try {
      const record = updateMobileOtpConsent(req.body, req);
      res.json(record);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to update mobile OTP consent' });
    }
  });

  app.post('/api/mobile-otp-tracking/status', (req, res) => {
    try {
      const record = updateMobileOtpStatus(req.body, req);
      res.json(record);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to update mobile OTP status' });
    }
  });

  app.post('/api/mobile-otp-tracking/resend-reminder', (req, res) => {
    try {
      const result = resendMobileOtpReminder(req.body.id, req);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to resend mobile OTP reminder' });
    }
  });

  // --- MULTI-SENDER EMAIL ENDPOINTS ---

  // Get all senders (with verification statuses)
  app.get('/api/email/senders', (req, res) => {
    try {
      const senders = getEmailSenders();
      res.json(senders);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch email senders' });
    }
  });

  // Get only verified senders for outbound dropdown
  app.get('/api/email/senders/verified', (req, res) => {
    try {
      const senders = getVerifiedEmailSenders();
      res.json(senders);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch verified senders' });
    }
  });

  // Create or update a sender identity
  app.post('/api/email/senders', (req, res) => {
    try {
      const sender = saveEmailSender(req.body, req);
      res.json(sender);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to save email sender' });
    }
  });

  // Verify and authorize a sender
  app.post('/api/email/senders/:id/verify', (req, res) => {
    try {
      const sender = verifyEmailSender(req.params.id, req);
      res.json(sender);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to verify sender' });
    }
  });

  // Set default sender
  app.post('/api/email/senders/:id/default', (req, res) => {
    try {
      const sender = setDefaultEmailSender(req.params.id, req);
      res.json(sender);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to set default sender' });
    }
  });

  // Delete sender
  app.delete('/api/email/senders/:id', (req, res) => {
    try {
      const ok = deleteEmailSender(req.params.id, req);
      res.json({ success: ok });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to delete sender' });
    }
  });

  // Get masked SMTP configuration
  app.get('/api/email/smtp', (req, res) => {
    try {
      const config = getEmailSmtpConfig();
      res.json(config);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to get SMTP config' });
    }
  });

  // Update SMTP configuration
  app.post('/api/email/smtp', (req, res) => {
    try {
      const updated = saveEmailSmtpConfig(req.body, req);
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to save SMTP config' });
    }
  });

  // Test SMTP connection
  app.post('/api/email/smtp/test', async (req, res) => {
    try {
      const result = await testSmtpConnection(req);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'SMTP connection test failed' });
    }
  });

  // Get email dispatch logs
  app.get('/api/email/logs', (req, res) => {
    try {
      const { search, sender, status } = req.query;
      const logs = getEmailLogs({
        search: search as string,
        sender: sender as string,
        status: status as string
      });
      res.json(logs);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch email logs' });
    }
  });

  // Send customer email (Strict authorized sender verification enforced)
  app.post('/api/email/send', async (req, res) => {
    try {
      const record = await sendCustomerEmail(req.body, req);
      res.json({ success: true, record });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to dispatch email' });
    }
  });

  // --- VITE MIDDLEWARE (Dev) / STATIC SERVING (Prod) ---
  const distPath = path.join(process.cwd(), 'dist');
  const distExists = fs.existsSync(path.join(distPath, 'index.html'));

  // Strong caching on versioned static assets to prevent redundant hits on Google Frontend
  if (distExists) {
    app.use('/assets', express.static(path.join(distPath, 'assets'), {
      maxAge: '1y',
      immutable: true
    }));
  }

  if (process.env.NODE_ENV !== 'production' && !process.env.FORCE_PROD_STATIC) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(distPath, {
      maxAge: '1h'
    }));
    app.get('*', (req, res) => {
      res.setHeader('Cache-Control', 'no-cache, must-revalidate');
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Central Server running on http://0.0.0.0:${PORT}`);

    // Automatically synchronize with live Render production server in background
    if (!process.env.RENDER && !process.env.IS_RENDER) {
      setTimeout(() => {
        syncWithLiveProductionServer().catch(() => {});
      }, 2000);
      setInterval(() => {
        syncWithLiveProductionServer().catch(() => {});
      }, 15000);
    }
  });
}

startServer().catch(err => {
  console.error('Failed to start central server:', err);
});
