import { server } from "./src/app.js";
import { connectDB } from "./src/config/database.js";
import { PORT } from "./src/config/environment.js";
import ioSocket from "./src/config/socket.js";

const startServer = async () => {
  try {
    await connectDB();
    const io = ioSocket(server);

    server.listen(PORT, () => {
      console.log(
        `✅ Tanstack Server with Socket.IO listening on port ${PORT} 🌍 URL: http://localhost:${PORT}`
      );
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
  }
};

startServer();
