import { useEffect } from "react";
import { io } from "socket.io-client";
import { toast } from "sonner";

const SOCKET_URL = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(/\/api\/?$/, "");

// Real-time toasts. Call once inside the dashboard with the logged-in user.
export default function useLiveNotifications(me) {
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!me || !token) return;

    const socket = io(SOCKET_URL, { auth: { token }, transports: ["websocket", "polling"] });

    socket.on("application:new", (e) =>
      toast.success(`New applicant for ${e.jobTitle}`, {
        description: `${e.applicant}${e.matchScore != null ? ` · ${e.matchScore}% match` : ""}`,
      }));
    socket.on("job:approved", (e) =>
      toast.success(`${e.jobTitle} is now live`, {
        description: e.pointsAwarded ? `You earned ${e.pointsAwarded} loyalty points` : undefined,
      }));
    socket.on("job:rejected", (e) => toast.error(`${e.jobTitle} needs changes`, { description: e.reason }));
    socket.on("job:targeted", (e) => toast(`New job for you: ${e.jobTitle}`));

    return () => socket.disconnect();
  }, [me?._id]); // eslint-disable-line react-hooks/exhaustive-deps
}