const AppError = require("./AppError");

const requireAuth = (context) => {
  if (!context.userId) {
    throw new AppError("Authentication required", "UNAUTHENTICATED", 401);
  }
};

module.exports = requireAuth;
