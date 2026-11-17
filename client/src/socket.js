import { io } from "socket.io-client";

// Frontend file: put it at src/socket.js.
// If you already create a socket.io-client instance somewhere (for notifications),
// export that one as the default instead and delete this file.
const socket = io(import.meta.env.VITE_SOCKET_URL || "http://localhost:5000", {
  autoConnect: false, // the interview hook connects when needed
  // Read at connect time so a fresh login token is always used.
  // Change "token" to whatever key your app stores the JWT under.
  auth: (cb) => cb({ token: localStorage.getItem("token") }),
});

export default socket;