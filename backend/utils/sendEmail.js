import nodemailer from "nodemailer";

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
