import mongoose from 'mongoose';

const mediaSchema = new mongoose.Schema(
  {
    url: String,
    thumbnail: String,
    type: {
      type: String,
      enum: ['image', 'video'],
      required: true
    },
    width: Number,
    height: Number,
    duration: Number
  },
  { _id: false }
);

const downloadHistorySchema = new mongoose.Schema(
  {
    sourceUrl: {
      type: String,
      required: true,
      index: true
    },
    type: {
      type: String,
      enum: ['reel', 'post', 'story', 'carousel'],
      required: true
    },
    caption: String,
    duration: Number,
    timestamp: Date,
    media: [mediaSchema],
    action: {
      type: String,
      enum: ['analyze', 'download'],
      default: 'analyze',
      index: true
    },
    ipHash: String
  },
  { timestamps: true }
);

downloadHistorySchema.index({ createdAt: -1 });

export const DownloadHistory = mongoose.model('DownloadHistory', downloadHistorySchema);
