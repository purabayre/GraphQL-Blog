const mongoose = require("mongoose");
const Post = require("../../models/Post");

const requireAuth = require("../../utils/requireAuth");

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const postResolvers = {
  post: async ({ id }) => {
    if (!isValidObjectId(id)) throw new Error("Invalid post ID");

    const post = await Post.findById(id)
      .populate("author")
      .populate("comments.author");

    if (!post) throw new Error("Post not found");

    return post;
  },

  posts: async (parent, args) => {
    const { page = 1, limit = 5, status, tag, search } = args || {};

    const query = {};

    if (status) query.status = status;
    if (tag) query.tags = tag;

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { content: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (page - 1) * limit;

    const posts = await Post.find(query)
      .populate("author")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalCount = await Post.countDocuments(query);

    return {
      posts: posts || [],
      totalCount: totalCount || 0,
      hasNextPage: skip + posts.length < totalCount,
    };
  },

  createPost: async ({ input }, context) => {
    requireAuth(context);

    const post = await Post.create({
      ...input,
      author: context.userId,
      tags: input.tags || [],
    });

    return await Post.findById(post._id).populate("author");
  },

  updatePost: async ({ id, input }, context) => {
    requireAuth(context);

    if (!isValidObjectId(id)) throw new Error("Invalid post ID");

    const post = await Post.findById(id);

    if (!post) throw new Error("Post not found");

    if (post.author.toString() !== context.userId) {
      throw new Error("Not allowed");
    }

    return await Post.findByIdAndUpdate(
      id,
      { $set: input },
      { new: true },
    ).populate("author");
  },

  deletePost: async ({ id }, context) => {
    requireAuth(context);

    if (!isValidObjectId(id)) throw new Error("Invalid post ID");

    const post = await Post.findById(id);

    if (!post) throw new Error("Post not found");

    if (post.author.toString() !== context.userId) {
      throw new Error("Not allowed");
    }

    await Post.findByIdAndDelete(id);

    return true;
  },

  // =========================
  // COMMENTS
  // =========================

  addComment: async ({ postId, body }, context) => {
    requireAuth(context);

    if (!isValidObjectId(postId)) throw new Error("Invalid post ID");

    if (!body || body.trim().length < 2) {
      throw new Error("Comment too short");
    }

    const post = await Post.findById(postId);

    if (!post) throw new Error("Post not found");

    post.comments.push({
      body,
      author: context.userId,
    });

    await post.save();

    return await Post.findById(postId)
      .populate("author")
      .populate("comments.author");
  },

  deleteComment: async ({ postId, commentId }, context) => {
    requireAuth(context);

    if (!isValidObjectId(postId)) throw new Error("Invalid post ID");
    if (!isValidObjectId(commentId)) throw new Error("Invalid comment ID");

    const post = await Post.findById(postId);

    if (!post) throw new Error("Post not found");

    const comment = post.comments.id(commentId);

    if (!comment) throw new Error("Comment not found");

    if (comment.author.toString() !== context.userId) {
      throw new Error("Not allowed");
    }

    comment.remove();

    await post.save();

    return await Post.findById(postId)
      .populate("author")
      .populate("comments.author");
  },
  publishPost: async ({ id }, context) => {
    const requireAuth = require("../../utils/requireAuth");
    requireAuth(context);

    if (!isValidObjectId(id)) throw new Error("Invalid post ID");

    const post = await Post.findById(id);

    if (!post) {
      throw new Error("Post not found");
    }

    // ownership check
    if (post.author.toString() !== context.userId) {
      throw new Error("Not allowed");
    }

    post.status = "PUBLISHED";
    await post.save();

    return await Post.findById(id).populate("author");
  },
  unpublishPost: async ({ id }, context) => {
    const requireAuth = require("../../utils/requireAuth");
    requireAuth(context);

    if (!isValidObjectId(id)) throw new Error("Invalid post ID");

    const post = await Post.findById(id);

    if (!post) {
      throw new Error("Post not found");
    }

    // ownership check
    if (post.author.toString() !== context.userId) {
      throw new Error("Not allowed");
    }

    post.status = "DRAFT";
    await post.save();

    return await Post.findById(id).populate("author");
  },
};

module.exports = postResolvers;
