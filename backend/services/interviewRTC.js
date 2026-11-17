import Interview from "../models/Interview.js";

const EARLY_MS = 15 * 60 * 1000; // room opens 15 min before the scheduled time
const GRACE_MS = 60 * 60 * 1000; // stays open 1 hr after the scheduled end

const fail = (status, message, extra = {}) =>
  Object.assign(new Error(message), { status, ...extra });

/**
 * Checks that userId is the employer or applicant on this interview and that
 * the interview window is open. Used by BOTH the REST endpoint and the socket join.
 */
export async function authorizeInterview(interviewId, userId) {
  let interview;
  try {
    interview = await Interview.findById(interviewId);
  } catch {
    throw fail(404, "Interview not found");
  }
  if (!interview) throw fail(404, "Interview not found");
  if (interview.status === "Cancelled") throw fail(410, "This interview was cancelled");

  const uid = String(userId);
  const role =
    String(interview.employer) === uid ? "employer"
    : String(interview.applicant) === uid ? "applicant"
    : null;
  if (!role) throw fail(403, "This isn't your interview");

  const start = new Date(interview.scheduledAt).getTime();
  const end = start + (interview.duration || 60) * 60 * 1000 + GRACE_MS;
  const now = Date.now();
  if (now < start - EARLY_MS)
    throw fail(425, "This interview hasn't opened yet", { startsAt: interview.scheduledAt });
  if (now > end) throw fail(410, "This interview has ended");

  return { interview, role };
}

/**
 * ICE servers sent to the client after authorization, so your Xirsys
 * ident/secret never reach the browser.
 *
 * .env:
 *   XIRSYS_HOST=https://global.xirsys.net
 *   XIRSYS_IDENT=your_ident
 *   XIRSYS_SECRET=your_secret
 *   XIRSYS_CHANNEL=your_channel
 */
export async function getIceServers() {
  const servers = [{ urls: "stun:stun.l.google.com:19302" }];
  const { XIRSYS_HOST = "https://global.xirsys.net", XIRSYS_IDENT, XIRSYS_SECRET, XIRSYS_CHANNEL } = process.env;
  if (!XIRSYS_IDENT || !XIRSYS_SECRET || !XIRSYS_CHANNEL) {
    console.warn("Xirsys env vars missing: calls will use STUN only");
    return servers;
  }
  try {
    const res = await fetch(`${XIRSYS_HOST}/_turn/${XIRSYS_CHANNEL}`, {
      method: "PUT",
      headers: {
        Authorization: "Basic " + Buffer.from(`${XIRSYS_IDENT}:${XIRSYS_SECRET}`).toString("base64"),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ format: "urls" }),
    });
    const json = await res.json();
    if (!res.ok || json.s !== "ok") throw new Error(typeof json.v === "string" ? json.v : `HTTP ${res.status}`);
    return [...servers, ...[].concat(json.v.iceServers)]; // Xirsys returns one object or an array
  } catch (err) {
    console.error("Xirsys request failed:", err.message);
    return servers;
  }
}

/**
 * Call this inside io.on("connection", ...). The server only relays messages;
 * all media flows peer-to-peer (or through TURN).
 */
export function registerInterviewHandlers(io, socket) {
  const roomOf = (id) => `interview:${id}`;

  const leaveRoom = () => {
    const id = socket.data.interviewId;
    if (!id) return;
    socket.data.interviewId = null;
    socket.to(roomOf(id)).emit("interview:peer-left");
    socket.leave(roomOf(id));
  };

  socket.on("interview:join", async (payload, ack = () => {}) => {
    try {
      const interviewId = payload?.interviewId;
      await authorizeInterview(interviewId, socket.userId);

      // Leave any previous room (e.g. rejoin after a reconnect)
      leaveRoom();

      const room = roomOf(interviewId);
      const existing = await io.in(room).fetchSockets();

      // Same person opened a second tab: the newest tab wins
      for (const s of existing) {
        if (s.userId === socket.userId) {
          s.data.interviewId = null;
          s.emit("interview:replaced");
          s.leave(room);
        }
      }
      const others = existing.filter((s) => s.userId !== socket.userId);

      socket.data.interviewId = interviewId;
      socket.join(room);

      // The peer who was already in the room becomes the one that sends the offer
      socket.to(room).emit("interview:peer-joined");
      ack({ ok: true, peerPresent: others.length > 0 });
    } catch (err) {
      ack({ ok: false, message: err.message || "Could not join", status: err.status || 500 });
    }
  });

  // Relay offers, answers and ICE candidates to the other person in the room
  socket.on("rtc:signal", (data) => {
    const id = socket.data.interviewId;
    if (!id || !data || typeof data !== "object") return;
    socket.to(roomOf(id)).emit("rtc:signal", data);
  });

  socket.on("interview:leave", leaveRoom);
  socket.on("disconnecting", leaveRoom);
}