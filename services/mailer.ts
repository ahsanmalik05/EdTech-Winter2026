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
    subject: 'Verify your email',
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111">
        <h2>Verify your email</h2>
        <p>Thanks for registering. Click the button below to verify your email address.</p>
        <p>
          <a href="${verifyUrl}" style="background:#111;color:#fff;padding:10px 14px;text-decoration:none;border-radius:6px;display:inline-block">
            Verify Email
          </a>
        </p>
        <p>This link expires in 24 hours.</p>
      </div>
    `,
    text: `Verify your email by opening this link: ${verifyUrl}`,
  });
}
