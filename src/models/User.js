const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },

    passwordHash: {
      type: String,
      required: true,
    },

    avatarUrl: {
      type: String,
    },
  },
  {
    timestamps: {
      createdAt: true,
      updatedAt: false,
    },
  },
);

userSchema.methods.posts = async function (_args, context) {
  const Post = require("./Post");
  const query = { author: this._id, status: "PUBLISHED" };

  if (context?.userId && context.userId.toString() === this._id.toString()) {
    delete query.status;
  }

  return Post.find(query).populate("author").populate("comments.author");
};

module.exports = mongoose.model("User", userSchema);
