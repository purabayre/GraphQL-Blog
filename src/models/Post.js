const mongoose = require("mongoose");

const commentSchema = new mongoose.Schema(
  {
    body: {
      type: String,
      required: true,
      trim: true,
    },

    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: {
      createdAt: true,
      updatedAt: false,
    },
  },
);

const postSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    content: {
      type: String,
      required: true,
    },

    imageUrl: {
      type: String,
    },

    status: {
      type: String,
      enum: ["DRAFT", "PUBLISHED"],
      default: "DRAFT",
    },

    tags: [
      {
        type: String,
      },
    ],

    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    comments: [commentSchema],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

postSchema.virtual("likesCount").get(function () {
  return this.likes.length;
});

module.exports = mongoose.model("Post", postSchema);
