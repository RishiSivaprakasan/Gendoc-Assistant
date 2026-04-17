import mongoose from 'mongoose';

import { connectDb } from '../config/db.js';

async function main() {
  await connectDb();

  const col = mongoose.connection.db.collection('documents');

  const indexes = await col.indexes();
  const hasBadIndex = indexes.some((i) => i.name === 'userId_1_clientId_1');

  if (!hasBadIndex) {
    process.stdout.write('Index userId_1_clientId_1 not found. Nothing to do.\n');
    return;
  }

  await col.dropIndex('userId_1_clientId_1');
  process.stdout.write('Dropped index userId_1_clientId_1 successfully.\n');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    process.stderr.write(`Failed to drop index: ${err?.message ?? String(err)}\n`);
    process.exit(1);
  });
