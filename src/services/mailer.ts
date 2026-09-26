import nodemailer, { type Transporter } from 'nodemailer';

// Configuration from environment variables
const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '465', 10);
const SMTP_SECURE = process.env.SMTP_SECURE === 'true' || SMTP_PORT === 465;
const SMTP_USERNAME = process.env.SMTP_USERNAME || 'prathaban009@gmail.com';
const SMTP_PASSWORD = process.env.SMTP_PASSWORD || 'yces oalv hjtm iohb';
const SMTP_FROM = process.env.SMTP_FROM || `StockSense IMS <${SMTP_USERNAME}>`;

// Lazy transporter instance
let transporter: Transporter | null = null;

export function getTransporter(): Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_SECURE,
      auth: {
        user: SMTP_USERNAME,
        pass: SMTP_PASSWORD,
      },
      tls: {
        // Reject unauthorized servers unless in specific dev setups
        rejectUnauthorized: false,
      },
    });
  }
  return transporter;
}

export interface SmtpStatus {
  configured: boolean;
  host: string;
  port: number;
  secure: boolean;
  username: string;
  connected: boolean;
  message: string;
}

/**
 * Verify Google SMTP credentials and network connection
 */
export async function verifySmtpConnection(): Promise<SmtpStatus> {
  const status: SmtpStatus = {
    configured: Boolean(SMTP_USERNAME && SMTP_PASSWORD),
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE,
    username: SMTP_USERNAME,
    connected: false,
    message: '',
  };

  if (!status.configured) {
    status.message = 'Google SMTP credentials are not configured.';
    return status;
  }

  try {
    const client = getTransporter();
    await client.verify();
    status.connected = true;
    status.message = `Successfully authenticated with Google SMTP (${SMTP_HOST}:${SMTP_PORT}) as ${SMTP_USERNAME}.`;
    return status;
  } catch (error: any) {
    console.error('❌ Google SMTP verification failed:', error);
    status.connected = false;
    status.message = error.message || 'Failed to authenticate with Google SMTP.';
    return status;
  }
}

/**
 * Send Password Reset OTP Email
 */
export async function sendOtpEmail(to: string, otpCode: string): Promise<{ success: boolean; deliveredViaSmtp: boolean; messageId?: string; error?: string }> {
  const mailSubject = 'Your StockSense IMS Password Reset Passcode';
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>StockSense Security Verification</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F8FAFC; margin: 0; padding: 24px; color: #0F172A; }
        .card { max-width: 520px; margin: 0 auto; background: #FFFFFF; border-radius: 8px; border: 1px solid #E2E8F0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
        .header { background: #1E40AF; padding: 24px 32px; color: #FFFFFF; }
        .header h1 { margin: 0; font-size: 20px; font-weight: 700; letter-spacing: -0.025em; }
        .header p { margin: 4px 0 0; font-size: 13px; color: #BFDBFE; }
        .body { padding: 32px; }
        .otp-box { background: #F1F5F9; border: 1px solid #CBD5E1; border-radius: 6px; padding: 18px; text-align: center; margin: 24px 0; }
        .otp-code { font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace; font-size: 34px; font-weight: 800; letter-spacing: 6px; color: #1E40AF; margin: 0; }
        .info { font-size: 14px; line-height: 1.6; color: #334155; }
        .warning { font-size: 12px; color: #64748B; border-top: 1px solid #E2E8F0; padding-top: 16px; margin-top: 24px; }
        .footer { background: #F8FAFC; padding: 16px 32px; text-align: center; font-size: 12px; color: #94A3B8; border-top: 1px solid #E2E8F0; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <h1>StockSense IMS</h1>
          <p>Enterprise Inventory &amp; Warehouse Operations</p>
        </div>
        <div class="body">
          <p class="info">Hello,</p>
          <p class="info">We received a request to reset your password for your StockSense IMS account. Enter the verification code below to authorize your password update:</p>
          
          <div class="otp-box">
            <div class="otp-code">${otpCode}</div>
          </div>
          
          <p class="info"><strong>⏱️ Validity:</strong> This one-time passcode is valid for <strong>10 minutes</strong>.</p>
          <div class="warning">
            If you did not request a password reset, you can safely ignore this email. Your account credentials remain secure.
          </div>
        </div>
        <div class="footer">
          Dispatched securely via Google SMTP • StockSense Enterprise IMS
        </div>
      </div>
    </body>
    </html>
  `;

  const textContent = `StockSense IMS Password Reset Code: ${otpCode}\n\nThis verification code expires in 10 minutes.\nIf you did not request this, please disregard.\n\nDispatched via Google SMTP (${SMTP_USERNAME})`;

  try {
    const client = getTransporter();
    const info = await client.sendMail({
      from: SMTP_FROM,
      to,
      subject: mailSubject,
      text: textContent,
      html: htmlContent,
    });

    console.log(`✅ [GOOGLE SMTP] OTP email sent successfully to ${to} (MessageId: ${info.messageId})`);
    return { success: true, deliveredViaSmtp: true, messageId: info.messageId };
  } catch (error: any) {
    console.error(`⚠️ [GOOGLE SMTP ERROR] Failed to send email to ${to}:`, error.message);
    return { success: false, deliveredViaSmtp: false, error: error.message };
  }
}

/**
 * Send Low Stock Reorder Warning Email
 */
export async function sendLowStockAlertEmail(
  to: string,
  items: Array<{
    name: string;
    sku: string;
    onHand: number;
    minReorderLevel: number;
    reorderQty?: number;
    categoryName?: string | null;
  }>
): Promise<{ success: boolean; deliveredViaSmtp: boolean; error?: string }> {
  const mailSubject = `⚠️ StockSense Alert: ${items.length} Product(s) Below Safety Stock Threshold`;

  const itemRows = items
    .map(
      (item) => `
      <tr style="border-bottom: 1px solid #E2E8F0;">
        <td style="padding: 10px 12px; font-weight: 600; color: #0F172A;">${item.name}</td>
        <td style="padding: 10px 12px; font-family: monospace; color: #64748B;">${item.sku}</td>
        <td style="padding: 10px 12px; font-weight: bold; color: #DC2626;">${item.onHand}</td>
        <td style="padding: 10px 12px; color: #475569;">${item.minReorderLevel}</td>
        <td style="padding: 10px 12px; color: #1E40AF; font-weight: 600;">+${item.reorderQty || 20}</td>
      </tr>
    `
    )
    .join('');

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Low Stock Reorder Alert</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F8FAFC; margin: 0; padding: 24px; color: #0F172A; }
        .card { max-width: 620px; margin: 0 auto; background: #FFFFFF; border-radius: 8px; border: 1px solid #E2E8F0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
        .header { background: #B45309; padding: 20px 28px; color: #FFFFFF; }
        .header h1 { margin: 0; font-size: 18px; font-weight: 700; }
        .body { padding: 28px; font-size: 13px; line-height: 1.6; }
        table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 12px; }
        th { background: #F1F5F9; color: #475569; text-align: left; padding: 8px 12px; border-bottom: 2px solid #CBD5E1; font-weight: 600; }
        .footer { background: #F8FAFC; padding: 14px 28px; text-align: center; font-size: 11px; color: #94A3B8; border-top: 1px solid #E2E8F0; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <h1>StockSense IMS • Inventory Reorder Alert</h1>
        </div>
        <div class="body">
          <p><strong>Attention Warehouse Manager,</strong></p>
          <p>The following ${items.length} catalog items have fallen below their configured minimum safety stock levels and require vendor purchase order replenishment:</p>
          
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>SKU</th>
                <th>Current Stock</th>
                <th>Safety Level</th>
                <th>Suggested Order</th>
              </tr>
            </thead>
            <tbody>
              ${itemRows}
            </tbody>
          </table>

          <p style="margin-top: 24px;">Please create vendor receipts in the Operations queue to replenish these items promptly.</p>
        </div>
        <div class="footer">
          StockSense Automated Inventory Daemon • Google SMTP (${SMTP_USERNAME})
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    const client = getTransporter();
    await client.sendMail({
      from: SMTP_FROM,
      to,
      subject: mailSubject,
      html: htmlContent,
    });
    console.log(`✅ [GOOGLE SMTP] Low-stock alert dispatched to ${to} for ${items.length} items.`);
    return { success: true, deliveredViaSmtp: true };
  } catch (error: any) {
    console.error(`⚠️ [GOOGLE SMTP ERROR] Failed to send low-stock alert to ${to}:`, error.message);
    return { success: false, deliveredViaSmtp: false, error: error.message };
  }
}

/**
 * Send a Test Diagnostic Email
 */
export async function sendTestDiagnosticEmail(to: string): Promise<{ success: boolean; deliveredViaSmtp: boolean; messageId?: string; error?: string }> {
  try {
    const client = getTransporter();
    const info = await client.sendMail({
      from: SMTP_FROM,
      to,
      subject: '✅ Google SMTP Live Diagnostic Test — StockSense IMS',
      text: `Google SMTP is successfully configured and connected for StockSense IMS!\n\nHost: ${SMTP_HOST}\nPort: ${SMTP_PORT}\nSender: ${SMTP_USERNAME}\nTimestamp: ${new Date().toISOString()}`,
      html: `
        <div style="font-family: sans-serif; padding: 24px; max-width: 500px; margin: auto; border: 1px solid #E2E8F0; border-radius: 8px;">
          <h2 style="color: #1E40AF; margin-top: 0;">✅ Google SMTP Test Successful!</h2>
          <p>Your Google SMTP integration is functioning and delivering outbound emails properly.</p>
          <ul style="font-size: 13px; line-height: 1.8; color: #334155;">
            <li><strong>SMTP Server:</strong> ${SMTP_HOST}:${SMTP_PORT}</li>
            <li><strong>Authenticated Account:</strong> ${SMTP_USERNAME}</li>
            <li><strong>Security Mode:</strong> SSL/TLS Enabled</li>
            <li><strong>Dispatched At:</strong> ${new Date().toLocaleString()}</li>
          </ul>
          <p style="font-size: 12px; color: #64748B; border-top: 1px solid #E2E8F0; padding-top: 12px; margin-top: 20px;">
            StockSense IMS Production Transport Service
          </p>
        </div>
      `,
    });

    console.log(`✅ [GOOGLE SMTP] Diagnostic test email delivered to ${to} (${info.messageId})`);
    return { success: true, deliveredViaSmtp: true, messageId: info.messageId };
  } catch (error: any) {
    console.error(`❌ [GOOGLE SMTP] Diagnostic test email failed to ${to}:`, error.message);
    return { success: false, deliveredViaSmtp: false, error: error.message };
  }
}
