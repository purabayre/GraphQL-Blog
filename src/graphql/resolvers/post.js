const mongoose = require("mongoose");
const Post = require("../../models/Post");
const AppError = require("../../utils/AppError");
const requireAuth = require("../../utils/requireAuth");

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

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

const normalizePagination = ({ page = 1, limit = 10 } = {}) => {
  const errors = [];
  const normalizedPage = Number(page);
  const normalizedLimit = Number(limit);

  if (!Number.isInteger(normalizedPage) || normalizedPage < 1) {
    errors.push("Page must be a positive integer");
  }

  if (
    !Number.isInteger(normalizedLimit) ||
    normalizedLimit < 1 ||
    normalizedLimit > 50
  ) {
    errors.push("Limit must be an integer between 1 and 50");
  }

  if (errors.length > 0) {
    throw new AppError("Validation failed", "BAD_USER_INPUT", 400, errors);
  }

  return {
    page: normalizedPage,
    limit: normalizedLimit,
  };
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
    const pattern = escapeRegex(search.trim());
    query.$or = [
      { title: { $regex: pattern, $options: "i" } },
      { content: { $regex: pattern, $options: "i" } },
    ];
  }
  return query;
};

const pagePaginate = async (query, page = 1, limit = 10) => {
  const skip = (page - 1) * limit;
  const [posts, totalCount] = await Promise.all([
    Post.find(query)
      .sort({ createdAt: -1, _id: -1 })
      .skip(skip)
      .limit(limit)
      .populate("author")
      .populate("comments.author"),
    Post.countDocuments(query),
  ]);

  return {
    posts,
    totalCount,
    hasNextPage: page * limit < totalCount,
  };
};

const cursorPaginate = async (query, after, first = 5) => {
  if (after && !isValidObjectId(after)) {
    throw new AppError("Invalid cursor", "BAD_USER_INPUT", 400);
  }

  const { limit } = normalizePagination({ page: 1, limit: first });
  const mongoQuery = { ...query };

  if (after) {
    mongoQuery._id = { $lt: new mongoose.Types.ObjectId(after) };
  }

  const posts = await Post.find(mongoQuery)
    .sort({ _id: -1 })
    .limit(limit + 1)
    .populate("author")
    .populate("comments.author");

  const hasNextPage = posts.length > limit;
  const slicedPosts = hasNextPage ? posts.slice(0, limit) : posts;

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
    const { limit: normalizedLimit } = normalizePagination({ page: 1, limit });

    const basePost = await Post.findById(postId);
    if (!basePost) {
      throw new AppError("Post not found", "NOT_FOUND", 404);
    }
    if (
      basePost.status === "DRAFT" &&
      (!context.userId || basePost.author.toString() !== context.userId)
    ) {
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
      .limit(normalizedLimit)
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
    const { page, limit } = normalizePagination(args);
    const { status, tag, search } = args || {};
    const query = buildPostsQuery({ status, tag, search }, context);
    if (!query)
      return { posts: [], totalCount: 0, hasNextPage: false };
    return await pagePaginate(query, page, limit);
  },

  myPosts: async (args, context) => {
    requireAuth(context);
    const { page, limit } = normalizePagination(args);
    const { status } = args || {};
    const query = buildPostsQuery({ status }, context, { forMyPosts: true });
    return await pagePaginate(query, page, limit);
  },

  postsConnection: async (args, context) => {
    const { after, first = 5, status, tag, search } = args || {};
    const query = buildPostsQuery({ status, tag, search }, context);
    if (!query)
      return { edges: [], pageInfo: { endCursor: null, hasNextPage: false } };
    return await cursorPaginate(query, after, first);
  },

  myPostsConnection: async (args, context) => {
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
    if (post.status === "DRAFT" && post.author.toString() !== context.userId) {
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
