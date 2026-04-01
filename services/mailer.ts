import nodemailer from 'nodemailer';
import config from '../config/config.js';

const transporter = nodemailer.createTransport({
  host: config.smtpHost,
  port: config.smtpPort,
  secure: config.smtpSecure,
  auth: {
    user: config.smtpUser,
    pass: config.smtpPass,
  },
});

export async function sendVerificationEmail(email: string, verifyUrl: string): Promise<void> {
  if (!config.smtpHost || !config.smtpUser || !config.smtpPass) {
    throw new Error('SMTP configuration is missing. Set SMTP_HOST, SMTP_USER and SMTP_PASS.');
  }

  await transporter.sendMail({
    from: config.mailFrom,
    to: email,
    subject: 'Verify your METY account',
    html: `
      <style>
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=Instrument+Serif:ital@0;1&display=swap');
      </style>
      <div style="margin:0;padding:28px;background:#fafafa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#111827;line-height:1.6;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e4e4e7;border-radius:14px;overflow:hidden;">
          <tr>
            <td style="padding:30px 28px 10px;text-align:center;">
              <div style="font-family:'Instrument Serif',Georgia,'Times New Roman',serif;font-size:44px;line-height:1;font-weight:400;letter-spacing:0.5px;color:#111827;">METY</div>
              <p style="margin:10px 0 0;font-family:'DM Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-size:13px;color:#71717a;">Educational AI Platform</p>
            </td>
          </tr>
          <tr>
            <td style="padding:10px 28px 0;">
              <h2 style="margin:0 0 12px;font-family:'DM Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-size:22px;line-height:1.25;color:#18181b;">Verify your email address</h2>
              <p style="margin:0 0 12px;font-family:'DM Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-size:14px;color:#3f3f46;">Thanks for joining METY. Confirm your email to activate your account and sign in.</p>
              <p style="margin:0 0 22px;font-family:'DM Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-size:13px;color:#71717a;">This verification link expires in 24 hours.</p>
              <a href="${verifyUrl}" style="display:inline-block;font-family:'DM Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;background:#18181b;color:#ffffff;text-decoration:none;padding:10px 16px;border-radius:8px;font-size:14px;font-weight:600;">Verify Email</a>
              <p style="margin:18px 0 0;font-family:'DM Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-size:12px;color:#71717a;word-break:break-all;">If the button does not work, copy and paste this link into your browser:<br/>${verifyUrl}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 28px 26px;font-family:'DM Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-size:12px;color:#a1a1aa;">If you did not create this account, you can ignore this email.</td>
          </tr>
        </table>
      </div>
    `,
    text: `Welcome to METY. Verify your email by opening this link: ${verifyUrl}. This link expires in 24 hours.`,
  });
}
