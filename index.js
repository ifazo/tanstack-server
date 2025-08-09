import { app } from './src/app.js';
import { connectDB } from './src/config/database.js';
import { PORT } from './src/config/environment.js';

const server = async () => {
  try {
    await connectDB();
    
    app.listen(PORT, () => {
      console.log(`✅ Tanstack Server listening on port ${PORT} 🌍 URL: http://localhost:${PORT}`);
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
  }
};

server();