const mongoose = require("mongoose");
const User = require("../../models/User");
const Post = require("../../models/Post");
const requireAuth = require("../../utils/requireAuth");
const AppError = require("../../utils/AppError");

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const userResolvers = {
  user: async ({ id }, context) => {
    if (!isValidObjectId(id)) {
      throw new AppError("Invalid user ID", "BAD_USER_INPUT", 400);
    }
    const user = await User.findById(id);
    if (!user) {
      throw new AppError("User not found", "NOT_FOUND", 404);
    }
    const postsQuery = { author: user._id, status: "PUBLISHED" };
    if (context.userId && context.userId.toString() === user._id.toString()) {
      delete postsQuery.status;
    }
    user.posts = await Post.find(postsQuery)
      .populate("author")
      .populate("comments.author");

    return user;
  },
  me: async (_, context) => {
    requireAuth(context);
    const user = await User.findById(context.userId);
    if (!user) {
      throw new AppError("User not found", "NOT_FOUND", 404);
    }
    user.posts = await Post.find({ author: user._id })
      .populate("author")
      .populate("comments.author");
    return user;
  },
};

module.exports = userResolvers;
