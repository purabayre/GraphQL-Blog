const mongoose = require("mongoose");
const Post = require("../../models/Post");
const AppError = require("../../utils/AppError");
const requireAuth = require("../../utils/requireAuth");
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);
const commentResolvers = {
  addComment: async ({ postId, body }, context) => {
    requireAuth(context);
    if (!isValidObjectId(postId)) {
      throw new AppError("Invalid post ID", "BAD_USER_INPUT", 400);
    }
    if (!body || body.trim().length < 2) {
      throw new AppError(
        "Comment must be at least 2 characters",
        "BAD_USER_INPUT",
        400,
      );
    }
    const post = await Post.findById(postId);
    if (!post) {
      throw new AppError("Post not found", "NOT_FOUND", 404);
    }
    if (post.status === "DRAFT" && post.author.toString() !== context.userId) {
      throw new AppError("Post not found", "NOT_FOUND", 404);
    }
    const comment = {
      body: body.trim(),
      author: context.userId,
    };
    post.comments.push(comment);
    await post.save();
    const savedPost = await Post.findById(postId)
      .populate("author")
      .populate("comments.author");
    return savedPost.comments.id(post.comments[post.comments.length - 1]._id);
  },

  deleteComment: async ({ commentId }, context) => {
    requireAuth(context);
    if (!isValidObjectId(commentId)) {
      throw new AppError("Invalid comment ID", "BAD_USER_INPUT", 400);
    }

    const post = await Post.findOne({ "comments._id": commentId });
    if (!post) {
      throw new AppError("Comment not found", "NOT_FOUND", 404);
    }

    const comment = post.comments.id(commentId);
    if (!comment) {
      throw new AppError("Comment not found", "NOT_FOUND", 404);
    }
    if (comment.author.toString() !== context.userId) {
      throw new AppError("Not allowed", "FORBIDDEN", 403);
    }
    post.comments = post.comments.filter((c) => c._id.toString() !== commentId);
    await post.save();
    return true;
  },
};

module.exports = commentResolvers;
