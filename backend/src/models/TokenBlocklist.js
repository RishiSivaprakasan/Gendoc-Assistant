import mongoose from 'mongoose';

const tokenBlocklistSchema = new mongoose.Schema(
  {
    jti: { type: String, required: true, unique: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

tokenBlocklistSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const TokenBlocklist = mongoose.model('TokenBlocklist', tokenBlocklistSchema);
