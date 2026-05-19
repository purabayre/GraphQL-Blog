const User = require("../../models/User");
const Post = require("../../models/Post");

const requireAuth = require("../../utils/requireAuth");
const AppError = require("../../utils/AppError");

const userResolvers = {
  user: async ({ id }) => {
    const user = await User.findById(id);

    if (!user) {
      throw new AppError("User not found", "NOT_FOUND", 404);
    }

    return user;
  },

  me: async (args, context) => {
    requireAuth(context);

    const user = await User.findById(context.userId);

    if (!user) {
      throw new AppError("User not found", "NOT_FOUND", 404);
    }

    return user;
  },

  posts: async (parent) => {
    return await Post.find({
      author: parent._id,
    });
  },
};

module.exports = userResolvers;
