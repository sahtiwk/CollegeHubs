const mongoose = require('mongoose');

const postSchema = new mongoose.Schema(
  {
    hubId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hub', required: true, immutable: true },
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 8192,
      validate: value => Buffer.byteLength(value, 'utf8') <= 8192,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Index for faster queries
postSchema.index({ hubId: 1, createdAt: -1, _id: 1 });
postSchema.index({ author: 1 });

module.exports = mongoose.model('Post', postSchema);
