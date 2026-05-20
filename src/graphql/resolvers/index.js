const authResolvers = require("./auth");
const postResolvers = require("./post");
const userResolvers = require("./user");
const commentResolvers = require("./comment");

module.exports = {
  ...authResolvers,
  ...userResolvers,
  ...postResolvers,
  ...commentResolvers,
};
