import nodemailer from "nodemailer";

let transporter;
const getTransporter = () => {
  // created lazily so dotenv has loaded by the time it is needed
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === "true",
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
  return transporter;
};

const esc = (s = "") =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// type: "blacklisted" | "reinstated"
export const sendAccountStatusEmail = async ({ to, name, type, reason }) => {
  const app = process.env.APP_NAME || "Job Platform";
  const support = process.env.SUPPORT_EMAIL || process.env.SMTP_USER;
  const blacklisted = type === "blacklisted";

  await getTransporter().sendMail({
    from: process.env.MAIL_FROM || `"${app}" <${process.env.SMTP_USER}>`,
    to,
    subject: blacklisted ? `Your ${app} account has been blacklisted` : `Your ${app} account has been reinstated`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:32px;border:1px solid #e2e8f0;border-radius:16px">
        <h2 style="margin:0 0 12px;color:${blacklisted ? "#b91c1c" : "#15803d"}">
          ${blacklisted ? "Account blacklisted" : "Account reinstated"}
        </h2>
        <p style="color:#334155">Hi ${esc(name || "there")},</p>
        <p style="color:#334155">
          ${
            blacklisted
              ? "Your account has been blacklisted, so you can no longer log in or use the platform."
              : "Good news: your account has been reinstated and you can log in again."
          }
        </p>
        ${
          reason
            ? `<div style="background:#f8fafc;border-left:4px solid ${blacklisted ? "#dc2626" : "#16a34a"};padding:12px 16px;margin:16px 0;color:#334155">
                <strong>${blacklisted ? "Reason" : "Note"}:</strong><br/>${esc(reason)}
              </div>`
            : ""
        }
        ${
          blacklisted
            ? `<p style="color:#64748b;font-size:13px">If you think this is a mistake, contact us at ${esc(support)}.</p>`
            : ""
        }
      </div>`,
  });
};
