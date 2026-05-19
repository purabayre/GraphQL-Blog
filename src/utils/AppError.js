const { GraphQLError } = require("graphql");

class AppError extends GraphQLError {
  constructor(message, code, statusCode, details = []) {
    super(message, {
      extensions: {
        code,
        statusCode,
        details,
      },
    });
  }
}

module.exports = AppError;
