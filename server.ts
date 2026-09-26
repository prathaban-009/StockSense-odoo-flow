import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import {
  clearAllDemoData,
  confirmOperationLine,
  createCategory,
  createLocation,
  createOperation,
  createProductWithStock,
  createUser,
  createWarehouse,
  getAllCategories,
  getAllLocations,
  getAllOperations,
  getAllProducts,
  getAllWarehouses,
  getDashboardStats,
  getOperationById,
  getStockLedger,
  getUserByEmail,
  getUserByUid,
  saveOtp,
  updateOperationStatus,
  updateProduct,
  updateUserPassword,
  validateOperation,
  verifyAndMarkOtp,
} from './src/db/queries.ts';
import {
  createNewEmployee,
  getAllEmployeesWithStats,
  getEmployeeMeta,
  setEmployeeMeta,
} from './src/db/employeeStore.ts';
import { createLocalToken, requireAuth, AuthRequest } from './src/middleware/auth.ts';
import { adminAuth } from './src/lib/firebase-admin.ts';
import {
  verifySmtpConnection,
  sendOtpEmail,
  sendLowStockAlertEmail,
  sendTestDiagnosticEmail,
} from './src/services/mailer.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  app.use(express.json());

  // ---------------- AUTH API ----------------

  // Register with email/password
  app.post('/api/auth/register', async (req, res) => {
    try {
      const { name, email, password, role } = req.body;
      if (!name || !email || !password) {
        return res.status(400).json({ error: 'Name, email, and password are required' });
      }

      const existing = await getUserByEmail(email);
      if (existing) {
        return res.status(400).json({ error: 'User with this email already exists' });
      }

      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);
      const uid = `local_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      const newUser = await createUser({
        uid,
        email,
        name,
        role: role || 'Inventory Manager',
        passwordHash,
      });

      const token = createLocalToken({
        uid: newUser.uid,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
      });

      res.status(201).json({
        user: {
          id: newUser.id,
          uid: newUser.uid,
          email: newUser.email,
          name: newUser.name,
          role: newUser.role,
        },
        token,
      });
    } catch (error: any) {
      console.error('Registration failed:', error);
      res.status(500).json({ error: error.message || 'Registration failed' });
    }
  });

  // Login with email/password
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      const user = await getUserByEmail(email);
      if (!user || !user.passwordHash) {
        return res.status(401).json({ error: 'Invalid credentials or user registered via Google' });
      }

      const isMatch = await bcrypt.compare(password, user.passwordHash);
      if (!isMatch) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const token = createLocalToken({
        uid: user.uid,
        email: user.email,
        name: user.name,
        role: user.role,
      });

      const meta = getEmployeeMeta(user.email);

      res.json({
        user: {
          id: user.id,
          uid: user.uid,
          email: user.email,
          name: user.name,
          role: user.role,
          canCreateReceipts: meta.canCreateReceipts ?? (user.role === 'Inventory Manager'),
          warehouseId: meta.warehouseId || 1,
        },
        token,
      });
    } catch (error: any) {
      console.error('Login failed:', error);
      res.status(500).json({ error: error.message || 'Login failed' });
    }
  });

  // Firebase Google Sign-In sync
  app.post('/api/auth/firebase-sync', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Missing Firebase ID token' });
      }

      const idToken = authHeader.split('Bearer ')[1].trim();
      const decoded = await adminAuth.verifyIdToken(idToken);

      let user = await getUserByUid(decoded.uid);
      if (!user) {
        const email = decoded.email || `${decoded.uid}@google.auth`;
        const name = decoded.name || email.split('@')[0];
        user = await createUser({
          uid: decoded.uid,
          email,
          name,
          role: 'Inventory Manager',
        });
      }

      res.json({
        user: {
          id: user.id,
          uid: user.uid,
          email: user.email,
          name: user.name,
          role: user.role,
        },
        token: idToken,
      });
    } catch (error: any) {
      console.error('Firebase sync failed:', error);
      res.status(401).json({ error: 'Failed to verify Firebase token: ' + error.message });
    }
  });

  // Request OTP for password reset
  app.post('/api/auth/request-otp', async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ error: 'Email is required' });
      }

      const user = await getUserByEmail(email);
      if (!user) {
        return res.status(404).json({ error: 'No user registered with this email address' });
      }

      // Generate 6-digit OTP code
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      await saveOtp(email, otpCode, 10);

      console.log('\n=============================================================');
      console.log('📬 [EMAIL / OTP SERVICE - GOOGLE SMTP TRANSPORT]');
      console.log(`👤 Recipient: ${email}`);
      console.log(`🔐 OTP Code:  ${otpCode}`);
      console.log(`⏱️  Validity:  10 minutes`);
      console.log('📦 Subject:   Your StockSense IMS Password Reset Passcode');
      console.log('=============================================================');

      // Dispatch via Google SMTP
      const mailResult = await sendOtpEmail(email, otpCode);

      res.json({
        success: true,
        message: mailResult.deliveredViaSmtp
          ? `Verification OTP sent to ${email} via Google SMTP.`
          : `OTP generated for ${email}. (Google SMTP delivery fallback active; test OTP available for preview testing)`,
        deliveredViaSmtp: mailResult.deliveredViaSmtp,
        smtpError: mailResult.error || null,
        // testOtpCode fallback provided per user request to prevent lockout during test/dev
        testOtpCode: otpCode,
        recipient: email,
        expiresInMinutes: 10,
      });
    } catch (error: any) {
      console.error('OTP request failed:', error);
      res.status(500).json({ error: error.message || 'Failed to generate OTP' });
    }
  });

  // Verify OTP and reset password
  app.post('/api/auth/verify-otp-reset-password', async (req, res) => {
    try {
      const { email, otpCode, newPassword } = req.body;
      if (!email || !otpCode || !newPassword) {
        return res.status(400).json({ error: 'Email, OTP code, and new password are required' });
      }

      const verification = await verifyAndMarkOtp(email, otpCode);
      if (!verification.valid) {
        return res.status(400).json({ error: verification.message });
      }

      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(newPassword, salt);
      await updateUserPassword(email, passwordHash);

      console.log(`✅ [AUTH] Password reset successfully for ${email}`);
      res.json({ success: true, message: 'Password has been successfully updated. You can now log in.' });
    } catch (error: any) {
      console.error('Password reset failed:', error);
      res.status(500).json({ error: error.message || 'Failed to reset password' });
    }
  });

  // Get current user profile
  app.get('/api/auth/me', requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
      let user = await getUserByUid(req.user.uid);
      if (!user && req.user.email) {
        user = await getUserByEmail(req.user.email);
      }
      if (!user) return res.status(404).json({ error: 'User not found' });
      const meta = getEmployeeMeta(user.email);
      res.json({
        user: {
          ...user,
          canCreateReceipts: meta.canCreateReceipts ?? (user.role === 'Inventory Manager'),
          warehouseId: meta.warehouseId || 1,
        },
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ---------------- DASHBOARD API ----------------
  app.get('/api/dashboard/stats', async (_req, res) => {
    try {
      const stats = await getDashboardStats();
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ---------------- PRODUCTS & CATEGORIES API ----------------
  app.get('/api/products', async (_req, res) => {
    try {
      const products = await getAllProducts();
      res.json(products);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/products', async (req, res) => {
    try {
      const product = await createProductWithStock(req.body);
      res.status(201).json(product);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put('/api/products/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const updated = await updateProduct(id, req.body);
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/categories', async (_req, res) => {
    try {
      const categories = await getAllCategories();
      res.json(categories);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/categories', async (req, res) => {
    try {
      const { name, description } = req.body;
      const category = await createCategory(name, description);
      res.status(201).json(category);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ---------------- WAREHOUSES & LOCATIONS API ----------------
  app.get('/api/warehouses', async (_req, res) => {
    try {
      const warehouses = await getAllWarehouses();
      res.json(warehouses);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/warehouses', async (req, res) => {
    try {
      const warehouse = await createWarehouse(req.body);
      res.status(201).json(warehouse);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/locations', async (_req, res) => {
    try {
      const locations = await getAllLocations();
      res.json(locations);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/locations', async (req, res) => {
    try {
      const location = await createLocation(req.body);
      res.status(201).json(location);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ---------------- OPERATIONS API ----------------
  app.get('/api/operations', async (req, res) => {
    try {
      const type = req.query.type as string | undefined;
      const ops = await getAllOperations(type);
      res.json(ops);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/operations/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const op = await getOperationById(id);
      if (!op) return res.status(404).json({ error: 'Operation not found' });
      res.json(op);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/operations', async (req, res) => {
    try {
      const newOp = await createOperation(req.body);
      res.status(201).json(newOp);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  const handleStatusChange = async (req: express.Request, res: express.Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      const { status, assignedStaff } = req.body;
      const updated = await updateOperationStatus(id, status, assignedStaff);
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };

  app.put('/api/operations/:id/status', handleStatusChange);
  app.patch('/api/operations/:id/status', handleStatusChange);

  app.post('/api/operations/:id/validate', async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const result = await validateOperation(id);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Confirm single line item (shelve, pick, or move)
  app.post('/api/operations/:id/lines/:lineId/confirm', async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const lineId = parseInt(req.params.lineId, 10);
      const result = await confirmOperationLine(id, lineId);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ---------------- EMPLOYEE MANAGEMENT API ----------------
  app.get('/api/employees', async (_req, res) => {
    try {
      const emps = await getAllEmployeesWithStats();
      res.json(emps);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/employees', async (req, res) => {
    try {
      const result = await createNewEmployee(req.body);
      res.status(201).json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put('/api/employees/:email/permissions', async (req, res) => {
    try {
      const { email } = req.params;
      const { canCreateReceipts, warehouseId } = req.body;
      const updated = setEmployeeMeta(email, { canCreateReceipts, warehouseId });
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ---------------- GOOGLE SMTP & MAIL DISPATCH API ----------------
  // Get SMTP connection status
  app.get('/api/mail/status', async (_req, res) => {
    try {
      const status = await verifySmtpConnection();
      res.json(status);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to check SMTP status' });
    }
  });

  // Test send an email through Google SMTP
  app.post('/api/mail/test-send', async (req, res) => {
    try {
      const { recipient } = req.body;
      if (!recipient) {
        return res.status(400).json({ error: 'Recipient email is required' });
      }

      const result = await sendTestDiagnosticEmail(recipient);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to send test email' });
    }
  });

  // Dispatch low stock reorder alert to manager
  app.post('/api/mail/send-low-stock-alert', async (req, res) => {
    try {
      const recipient = req.body.recipient || process.env.SMTP_USERNAME || 'prathaban009@gmail.com';
      const allProducts = await getAllProducts();
      const lowStockItems = allProducts.filter((p) => p.onHand <= (p.minReorderLevel ?? 10));

      if (lowStockItems.length === 0) {
        return res.json({
          success: true,
          message: 'All inventory items are currently above safety stock levels. No reorder alert required.',
          count: 0,
        });
      }

      const mailResult = await sendLowStockAlertEmail(
        recipient,
        lowStockItems.map((p) => ({
          name: p.name,
          sku: p.sku,
          onHand: p.onHand,
          minReorderLevel: p.minReorderLevel ?? 10,
          reorderQty: p.reorderQty ?? 20,
          categoryName: p.categoryName,
        }))
      );

      res.json({
        ...mailResult,
        itemCount: lowStockItems.length,
        recipient,
        message: mailResult.deliveredViaSmtp
          ? `Dispatched low-stock reorder alert for ${lowStockItems.length} items to ${recipient} via Google SMTP.`
          : `Failed to deliver low-stock alert via Google SMTP: ${mailResult.error}`,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to send low stock alert' });
    }
  });

  // ---------------- STOCK LEDGER / MOVE HISTORY API ----------------
  app.get('/api/stock-ledger', async (req, res) => {
    try {
      const search = req.query.search as string | undefined;
      const type = req.query.type as string | undefined;
      const ledger = await getStockLedger(search, type);
      res.json(ledger);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ---------------- EMAIL PROVIDER ARCHITECTURE & PLANS ----------------
  app.get('/api/email-plans', (_req, res) => {
    res.json({
      status: 'simulated_console_active',
      currentMode: 'Console Logging (Development / Testing)',
      plans: [
        {
          provider: 'Resend',
          status: 'Ready to configure',
          recommendedFor: 'Modern Developer Experience & Fast Setup',
          setupSteps: [
            '1. Sign up at resend.com and obtain an API Key (RESEND_API_KEY)',
            '2. Verify your sending domain (e.g. mail.stocksense.com) in DNS (SPF + DKIM)',
            '3. npm install resend',
            '4. In server.ts, replace console.log with: resend.emails.send({ from: "StockSense <auth@stocksense.com>", to, subject, html })',
          ],
        },
        {
          provider: 'SendGrid',
          status: 'Enterprise Standard',
          recommendedFor: 'High Volume & Deliverability Analytics',
          setupSteps: [
            '1. Create Twilio SendGrid account and generate API Key with Mail Send permission',
            '2. Authenticate Domain in SendGrid Settings',
            '3. npm install @sendgrid/mail',
            '4. Call sgMail.send({ to, from, templateId, dynamicTemplateData: { otpCode } })',
          ],
        },
        {
          provider: 'Amazon SES (Simple Email Service)',
          status: 'Cost-Effective Cloud Scale',
          recommendedFor: 'AWS Cloud Native Deployments',
          setupSteps: [
            '1. Verify domain or sender email identity in AWS SES Console',
            '2. Move SES out of sandbox mode for unrestricted recipient sending',
            '3. npm install @aws-sdk/client-ses',
            '4. Dispatch SendEmailCommand with UTF-8 payload',
          ],
        },
      ],
    });
  });

  // ---------------- SYSTEM DATA MANAGEMENT API ----------------
  app.post('/api/system/reset-demo-data', async (_req, res) => {
    try {
      const result = await clearAllDemoData();
      res.json(result);
    } catch (error: any) {
      console.error('Reset demo data failed:', error);
      res.status(500).json({ error: error.message || 'Failed to reset demo data' });
    }
  });

  // Mount Vite development middlewares in dev mode
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 StockSense Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server boot error:', err);
  process.exit(1);
});
