// backend/utils/mailer.js  (your existing mailer file, with two new templates at the bottom)
import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: Number(process.env.SMTP_PORT) === 465,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

export const sendEmail = ({ to, subject, html }) =>
  transporter.sendMail({
    from: process.env.MAIL_FROM || `"EJob" <${process.env.SMTP_USER}>`,
    to,
    subject,
    html,
  });

export const otpEmailHtml = (firstName, code, minutes) => `
  <div style="font-family:Arial,sans-serif;max-width:420px;margin:auto;padding:24px">
    <h2 style="color:#EA580C;margin:0 0 12px">Verify your email</h2>
    <p>Hi ${firstName}, use this code to finish creating your EJob account:</p>
    <p style="font-size:34px;letter-spacing:10px;font-weight:700;margin:20px 0">${code}</p>
    <p style="color:#78716C;font-size:13px">The code expires in ${minutes} minutes. If you didn't sign up, ignore this email.</p>
  </div>`;

/* ===================== NEW: password reset ===================== */
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export const resetPasswordEmailHtml = (name, link, minutes) => `
  <div style="font-family:Arial,sans-serif;max-width:460px;margin:auto;padding:24px">
    <h2 style="color:#EA580C;margin:0 0 12px">Reset your password</h2>
    <p>Hi ${esc(name)}, we received a request to reset the password of your EJob account.</p>
    <p style="margin:24px 0">
      <a href="${esc(link)}" style="background:#EA580C;color:#ffffff;text-decoration:none;font-weight:700;padding:12px 24px;border-radius:10px;display:inline-block">Choose a new password</a>
    </p>
    <p style="color:#78716C;font-size:13px">This link works once and expires in ${minutes} minutes.</p>
    <p style="color:#78716C;font-size:13px">If the button does not work, copy this address into your browser:<br><span style="word-break:break-all">${esc(link)}</span></p>
    <p style="color:#78716C;font-size:13px">If you did not ask for this, you can ignore this email. Your password stays the same.</p>
  </div>`;

export const passwordChangedEmailHtml = (name) => `
  <div style="font-family:Arial,sans-serif;max-width:460px;margin:auto;padding:24px">
    <h2 style="color:#EA580C;margin:0 0 12px">Your password was changed</h2>
    <p>Hi ${esc(name)}, the password of your EJob account was just changed.</p>
    <p style="color:#78716C;font-size:13px">If this was you, there is nothing more to do. If it was not you, reset your password again right away and contact our support team.</p>
  </div>`;