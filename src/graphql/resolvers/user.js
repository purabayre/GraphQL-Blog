const mongoose = require("mongoose");
const User = require("../../models/User");
const requireAuth = require("../../utils/requireAuth");
const AppError = require("../../utils/AppError");

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const validateUpdateMeInput = (input) => {
  const errors = [];

  if (input.name !== undefined && input.name.trim().length < 2) {
    errors.push("Name must be at least 2 characters");
  }

  if (input.avatarUrl !== undefined && input.avatarUrl.trim().length === 0) {
    errors.push("Avatar URL cannot be empty");
  }

  return errors;
};

const userResolvers = {
  user: async ({ id }, context) => {
    if (!isValidObjectId(id)) {
      throw new AppError("Invalid user ID", "BAD_USER_INPUT", 400);
    }
    const user = await User.findById(id);
    if (!user) {
      throw new AppError("User not found", "NOT_FOUND", 404);
    }
    return user;
  },

  me: async (_, context) => {
    requireAuth(context);
    const user = await User.findById(context.userId);
    if (!user) {
      throw new AppError("User not found", "NOT_FOUND", 404);
    }
    return user;
  },

  updateMe: async ({ input }, context) => {
    requireAuth(context);

    const errors = validateUpdateMeInput(input);
    if (errors.length > 0) {
      throw new AppError("Validation failed", "BAD_USER_INPUT", 400, errors);
    }

    const user = await User.findById(context.userId);
    if (!user) {
      throw new AppError("User not found", "NOT_FOUND", 404);
    }

    if (input.name !== undefined) user.name = input.name.trim();
    if (input.avatarUrl !== undefined) user.avatarUrl = input.avatarUrl.trim();

    await user.save();

    return user;
  },
};

module.exports = userResolvers;
