const mongoose = require("mongoose");
const Post = require("../../models/Post");
const AppError = require("../../utils/AppError");
const requireAuth = require("../../utils/requireAuth");

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const validatePostInput = (input, isUpdate = false) => {
  const errors = [];
  if (!isUpdate || input.title !== undefined) {
    if (!input.title || input.title.trim().length < 3) {
      errors.push("Title must be at least 3 characters");
    }
  }
  if (!isUpdate || input.content !== undefined) {
    if (!input.content || input.content.trim().length < 5) {
      errors.push("Content must be at least 5 characters");
    }
  }
  if (input.tags !== undefined && !Array.isArray(input.tags)) {
    errors.push("Tags must be an array of strings");
  }
  return errors;
};

const buildPostsQuery = (args, context, options = {}) => {
  const { status, tag, search } = args || {};
  const query = {};
  if (options.forMyPosts) {
    query.author = context.userId;
    if (status) query.status = status;
  } else {
    if (!status) {
      query.status = "PUBLISHED";
    } else if (status === "PUBLISHED") {
      query.status = "PUBLISHED";
    } else if (status === "DRAFT") {
      if (!context.userId) {
        return null;
      }
      query.status = "DRAFT";
      query.author = context.userId;
    }
  }
  if (tag) {
    query.tags = tag;
  }
  if (search) {
    query.$or = [
      { title: { $regex: search, $options: "i" } },
      { content: { $regex: search, $options: "i" } },
    ];
  }
  return query;
};

const cursorPaginate = async (query, after, first = 5) => {
  const mongoQuery = { ...query };

  if (after) {
    mongoQuery._id = { $lt: mongoose.Types.ObjectId(after) };
  }

  const posts = await Post.find(mongoQuery)
    .sort({ _id: -1 })
    .limit(first + 1)
    .populate("author")
    .populate("comments.author");

  const hasNextPage = posts.length > first;
  const slicedPosts = hasNextPage ? posts.slice(0, first) : posts;

  const edges = slicedPosts.map((post) => ({
    cursor: post._id.toString(),
    node: post,
  }));

  const endCursor = edges.length > 0 ? edges[edges.length - 1].cursor : null;

  return {
    edges,
    pageInfo: {
      endCursor,
      hasNextPage,
    },
  };
};

const postResolvers = {
  relatedPosts: async ({ postId, limit = 5 }, context) => {
    if (!isValidObjectId(postId)) {
      throw new AppError("Invalid post ID", "BAD_USER_INPUT", 400);
    }

    const basePost = await Post.findById(postId);
    if (!basePost) {
      throw new AppError("Post not found", "NOT_FOUND", 404);
    }

    const tags = basePost.tags || [];
    if (tags.length === 0) return [];

    const query = {
      _id: { $ne: basePost._id },
      tags: { $in: tags },
      status: "PUBLISHED",
    };

    // If requesting own draft access (author), include their drafts too
    if (context.userId && basePost.author?.toString?.() === context.userId) {
      query.$or = [
        { status: "PUBLISHED" },
        { status: "DRAFT", author: context.userId },
      ];
      delete query.status;
    }

    const posts = await Post.find(query)
      .sort({ _id: -1 })
      .limit(limit)
      .populate("author")
      .populate("comments.author");

    return posts;
  },

  post: async ({ id }, context) => {
    if (!isValidObjectId(id)) {
      throw new AppError("Invalid post ID", "BAD_USER_INPUT", 400);
    }
    const post = await Post.findById(id)
      .populate("author")
      .populate("comments.author");
    if (!post) {
      throw new AppError("Post not found", "NOT_FOUND", 404);
    }
    if (
      post.status === "DRAFT" &&
      (!context.userId || post.author._id.toString() !== context.userId)
    ) {
      throw new AppError("Post not found", "NOT_FOUND", 404);
    }
    return post;
  },

  posts: async (args, context) => {
    const { after, first = 5, status, tag, search } = args || {};
    const query = buildPostsQuery({ status, tag, search }, context);
    if (!query)
      return { edges: [], pageInfo: { endCursor: null, hasNextPage: false } };
    return await cursorPaginate(query, after, first);
  },

  myPosts: async (args, context) => {
    requireAuth(context);
    const { after, first = 5, status } = args || {};
    const query = buildPostsQuery({ status }, context, { forMyPosts: true });
    return await cursorPaginate(query, after, first);
  },

  createPost: async ({ input }, context) => {
    requireAuth(context);
    const errors = validatePostInput(input);
    if (errors.length > 0) {
      throw new AppError("Validation failed", "BAD_USER_INPUT", 400, errors);
    }
    const post = await Post.create({
      title: input.title.trim(),
      content: input.content.trim(),
      imageUrl: input.imageUrl || null,
      tags: input.tags || [],
      status: input.status || "DRAFT",
      author: context.userId,
    });
    return await Post.findById(post._id)
      .populate("author")
      .populate("comments.author");
  },

  updatePost: async ({ id, input }, context) => {
    requireAuth(context);
    if (!isValidObjectId(id)) {
      throw new AppError("Invalid post ID", "BAD_USER_INPUT", 400);
    }
    const post = await Post.findById(id);
    if (!post) {
      throw new AppError("Post not found", "NOT_FOUND", 404);
    }
    if (post.author.toString() !== context.userId) {
      throw new AppError("Not allowed", "FORBIDDEN", 403);
    }
    const errors = validatePostInput(input, true);
    if (errors.length > 0) {
      throw new AppError("Validation failed", "BAD_USER_INPUT", 400, errors);
    }
    const updateData = {};
    if (input.title !== undefined) updateData.title = input.title.trim();
    if (input.content !== undefined) updateData.content = input.content.trim();
    if (input.imageUrl !== undefined) updateData.imageUrl = input.imageUrl;
    if (input.tags !== undefined) updateData.tags = input.tags;
    if (input.status !== undefined) updateData.status = input.status;
    const updatedPost = await Post.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true },
    )
      .populate("author")
      .populate("comments.author");
    return updatedPost;
  },

  deletePost: async ({ id }, context) => {
    requireAuth(context);

    if (!isValidObjectId(id)) {
      throw new AppError("Invalid post ID", "BAD_USER_INPUT", 400);
    }
    const post = await Post.findById(id);
    if (!post) {
      throw new AppError("Post not found", "NOT_FOUND", 404);
    }
    if (post.author.toString() !== context.userId) {
      throw new AppError("Not allowed", "FORBIDDEN", 403);
    }
    await Post.findByIdAndDelete(id);
    return true;
  },

  publishPost: async ({ id }, context) => {
    requireAuth(context);
    if (!isValidObjectId(id)) {
      throw new AppError("Invalid post ID", "BAD_USER_INPUT", 400);
    }
    const post = await Post.findById(id);
    if (!post) {
      throw new AppError("Post not found", "NOT_FOUND", 404);
    }
    if (post.author.toString() !== context.userId) {
      throw new AppError("Not allowed", "FORBIDDEN", 403);
    }
    post.status = "PUBLISHED";
    await post.save();
    return await Post.findById(id)
      .populate("author")
      .populate("comments.author");
  },

  unpublishPost: async ({ id }, context) => {
    requireAuth(context);
    if (!isValidObjectId(id)) {
      throw new AppError("Invalid post ID", "BAD_USER_INPUT", 400);
    }
    const post = await Post.findById(id);
    if (!post) {
      throw new AppError("Post not found", "NOT_FOUND", 404);
    }
    if (post.author.toString() !== context.userId) {
      throw new AppError("Not allowed", "FORBIDDEN", 403);
    }
    post.status = "DRAFT";
    await post.save();
    return await Post.findById(id)
      .populate("author")
      .populate("comments.author");
  },

  likePost: async ({ postId }, context) => {
    requireAuth(context);
    if (!isValidObjectId(postId)) {
      throw new AppError("Invalid post ID", "BAD_USER_INPUT", 400);
    }
    const post = await Post.findById(postId);
    if (!post) {
      throw new AppError("Post not found", "NOT_FOUND", 404);
    }
    const userId = context.userId;
    const alreadyLiked = post.likes.includes(userId);
    if (alreadyLiked) {
      post.likes = post.likes.filter((id) => id.toString() !== userId);
    } else {
      post.likes.push(userId);
    }
    await post.save();
    return await Post.findById(postId)
      .populate("author")
      .populate("comments.author");
  },
};

module.exports = postResolvers;
