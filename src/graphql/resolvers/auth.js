const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const validator = require("validator");
const User = require("../../models/User");
const AppError = require("../../utils/AppError");
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: "7d" });
};

const authResolvers = {
  register: async ({ input }, context) => {
    const { name, email, password } = input;
    const normalizedEmail = email ? email.trim().toLowerCase() : "";
    const errors = [];
    if (!name || name.trim().length < 2) {
      errors.push("Name must be at least 2 characters");
    }
    if (!validator.isEmail(normalizedEmail)) {
      errors.push("Invalid email");
    }
    if (!password || password.length < 6) {
      errors.push("Password must be at least 6 characters");
    }
    if (errors.length > 0) {
      throw new AppError("Validation failed", "BAD_USER_INPUT", 400, errors);
    }
    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      throw new AppError("Email already exists", "BAD_USER_INPUT", 400);
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
    });
    const token = generateToken(user._id.toString());
    return {
      token,
      userId: user._id.toString(),
    };
  },

  login: async ({ email, password }, context) => {
    const normalizedEmail = email ? email.trim().toLowerCase() : "";
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      throw new AppError("Invalid credentials", "UNAUTHENTICATED", 401);
    }
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      throw new AppError("Invalid credentials", "UNAUTHENTICATED", 401);
    }
    const token = generateToken(user._id.toString());
    return {
      token,
      userId: user._id.toString(),
    };
  },
};

module.exports = authResolvers;
