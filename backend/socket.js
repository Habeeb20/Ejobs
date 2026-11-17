import jwt from "jsonwebtoken";
import { setIO } from "./utils/notify.js";
import { Server } from "socket.io";
import { registerInterviewHandlers } from "./services/interviewRtc.js";
export const initSocket = (httpServer) => {
  const io = new Server(httpServer, { cors: { origin: process.env.CLIENT_URL || "http://localhost:5173" } });

  io.use((socket, next) => {
    try {
      const { id } = jwt.verify(socket.handshake.auth?.token, process.env.JWT_SECRET);
      socket.userId = id;
      next();
    } catch {
      next(new Error("unauthorized"));
    }
  });
  // Each user joins a private room, so events only reach the right person

  io.on("connection", (socket) => {
  socket.join(`user:${socket.userId}`);
  registerInterviewHandlers(io, socket);   // new
});

  setIO(io);
  return io;
};

