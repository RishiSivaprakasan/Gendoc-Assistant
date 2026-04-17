import { createServer } from 'http';
import app from './app.js';
import { env } from './config/env.js';
import { connectDb } from './config/db.js';

await connectDb();

const server = createServer(app);

// Start server
server.listen(env.PORT, () => {
  console.log(`API listening on :${env.PORT}`);
});

// 🔥 Handle server errors (IMPORTANT)
server.on('error', (err) => {
  console.error('Server error:', err);
  process.exit(1);
});

// 🧹 Graceful shutdown (THIS FIXES YOUR ISSUE)
const shutdown = () => {
  console.log('Shutting down server...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
};

// Handle termination signals
process.on('SIGINT', shutdown);   // CTRL + C
process.on('SIGTERM', shutdown);  // system kill

// Nodemon restart fix
process.once('SIGUSR2', () => {
  shutdown();
  process.kill(process.pid, 'SIGUSR2');
});