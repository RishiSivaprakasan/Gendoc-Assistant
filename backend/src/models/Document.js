import mongoose from 'mongoose';

const chatMessageSchema = new mongoose.Schema(
  {
    sender: { type: String, enum: ['user', 'ai'], required: true },
    text: { type: String, required: true },
  },
  { _id: false }
);

const documentSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    fileName: { type: String, required: true },
    originalContent: { type: String, default: '' },
    translatedContent: { type: String, default: '' },
    summary: { type: String, default: '' },
    chatHistory: { type: [chatMessageSchema], default: [] },
    targetLanguage: { type: String, default: 'Tamil' },
  },
  { timestamps: true }
);

documentSchema.index({ userId: 1, createdAt: -1 });

export const Document = mongoose.model('Document', documentSchema);
