import bcrypt from 'bcryptjs';

import { connectDb } from '../config/db.js';
import { env } from '../config/env.js';
import { User } from '../models/User.js';
import { TokenBlocklist } from '../models/TokenBlocklist.js';
import { Document } from '../models/Document.js';

const usersToSeed = [
  { email: 'admin@example.com', password: 'Admin@12345' },
  { email: 'user1@example.com', password: 'User1@12345' },
  { email: 'user2@example.com', password: 'User2@12345' },
  { email: 'user3@example.com', password: 'User3@12345' },
];

await connectDb();

await TokenBlocklist.deleteMany({});
await Document.deleteMany({});
await User.deleteMany({});

for (const u of usersToSeed) {
  const passwordHash = await bcrypt.hash(u.password, 12);
  await User.create({ email: u.email.toLowerCase(), passwordHash });
}

console.log(`Seeded ${usersToSeed.length} users (DB: ${env.MONGODB_URI})`);
for (const u of usersToSeed) {
  console.log(`- ${u.email} / ${u.password}`);
}

process.exit(0);
