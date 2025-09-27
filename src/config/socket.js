import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { JWT_SECRET_TOKEN } from "../config/environment.js";
import { setUserOnline, setUserOffline } from "../services/authService.js";

export default function initSocket(server) {
  const io = new Server(server, {
    cors: { origin: "*" },
  });

  const userSocketCount = new Map();

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token) return next(new Error("unauthorized"));
    try {
      const payload = jwt.verify(token, JWT_SECRET_TOKEN);
      socket.user = payload;
      return next();
    } catch (err) {
      return next(new Error("unauthorized"));
    }
  });

  io.on("connect", (socket) => {
    const userId = socket.user?._id;
    if (userId) {
      const current = userSocketCount.get(userId) || 0;
      userSocketCount.set(userId, current + 1);

      if (current === 0) {
        setUserOnline(userId).catch(console.error);
      }

      socket.join(`user:${userId}`);
    }

    socket.on("disconnect", () => {
      if (!userId) return;
      const current = userSocketCount.get(userId) || 1;
      const nextCount = Math.max(0, current - 1);
      if (nextCount === 0) {
        userSocketCount.delete(userId);
        setUserOffline(userId).catch(console.error);
      } else {
        userSocketCount.set(userId, nextCount);
      }
    });
  });

  return io;
}