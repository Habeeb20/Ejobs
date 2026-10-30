import { sendEmail } from "./sendEmail.js";
import nodemailer from "nodemailer";
let io = null;
export const setIO = (instance) => { io = instance; }; // called once from server.js

// Real-time: every user joins the room "user:<id>" when their socket connects
export const emitToUser = (userId, event, payload) =>
  io?.to(`user:${userId}`).emit(event, payload);

export const esc = (v = "") =>
  String(v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const shell = (title, body, cta) => `
<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:24px;color:#1e293b">
  <h2 style="color:#E4510B;margin:0 0 12px">${title}</h2>${body}
  ${cta ? `<p style="margin-top:20px"><a href="${cta.url}" style="background:#E4510B;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:bold">${cta.label}</a></p>` : ""}
</div>`;

// Never throws: a failed email must not break the request that triggered it
export const emailUser = (to, subject, title, body, cta) =>
  to
    ? sendEmail({ to, subject, html: shell(title, body, cta) }).catch((e) => console.error("email:", e.message))
    : Promise.resolve();
























// import nodemailer from "nodemailer";

// let io = null;
// export const setIo = (instance) => { io = instance; };

// const room = (userId) => `user:${userId}`;

// // Real-time toast. Does nothing if sockets aren't set up.
// export const emitToUser = (userId, event, payload = {}) => {
//   try {
//     if (io && userId) io.to(room(userId)).emit(event, payload);
//   } catch (e) {
//     console.error("emitToUser:", e.message);
//   }
// };

// export const esc = (value = "") =>
//   String(value)
//     .replace(/&/g, "&amp;")
//     .replace(/</g, "&lt;")
//     .replace(/>/g, "&gt;")
//     .replace(/"/g, "&quot;")
//     .replace(/'/g, "&#39;");

// let transporter;
// const getTransporter = () => {
//   if (!transporter) {
//     transporter = nodemailer.createTransport({
//       host: process.env.EMAIL_HOST,
//       port: Number(process.env.EMAIL_PORT) || 587,
//       secure: Number(process.env.EMAIL_PORT) === 465,
//       auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
//     });
//   }
//   return transporter;
// };

// // Never throws, so a mail problem can't break an approval or payment
// export const emailUser = async (to, subject, title, bodyHtml, action) => {
//   if (!to || !process.env.EMAIL_HOST) return;
//   const button = action?.url
//     ? `<p style="margin:24px 0"><a href="${esc(action.url)}" style="background:#2563eb;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none">${esc(action.label || "Open")}</a></p>`
//     : "";
//   const html = `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto">
//     <h2>${esc(title)}</h2>${bodyHtml}${button}</div>`;
//   try {
//     await getTransporter().sendMail({
//       from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
//       to,
//       subject,
//       html,
//     });
//   } catch (e) {
//     console.error("emailUser:", e.message);
//   }
// };