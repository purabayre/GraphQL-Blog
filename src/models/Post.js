const mongoose = require("mongoose");

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
    imageUrl: String,
    status: {
      type: String,
      enum: ["DRAFT", "PUBLISHED"],
      default: "DRAFT",
    },
    tags: {
      type: [String],
      default: [],
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    likes: [String],
    comments: [
      {
        _id: {
          type: mongoose.Schema.Types.ObjectId,
          default: () => new mongoose.Types.ObjectId(),
        },
        body: {
          type: String,
          required: true,
        },
        author: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  { timestamps: true },
);

postSchema.virtual("likesCount").get(function () {
  return this.likes ? this.likes.length : 0;
});

postSchema.set("toJSON", { virtuals: true });
postSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("Post", postSchema);
