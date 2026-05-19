const authResolvers = require("./auth");
const postResolvers = require("./post");
const userResolvers = require("./user");

module.exports = {
  ...authResolvers,
  ...postResolvers,
  ...userResolvers,
};
