import { sendEmail } from "./sendEmail.js";

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