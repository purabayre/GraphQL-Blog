const Post = require("../../models/Post");

const requireAuth = require("../../utils/requireAuth");
const AppError = require("../../utils/AppError");

const postResolvers = {
  post: async ({ id }) => {
    const post = await Post.findById(id).populate("author");

    if (!post) {
      throw new AppError("Post not found", "NOT_FOUND", 404);
    }

    return post;
  },

  posts: async (parent, args) => {
    try {
      console.log("🔥 POSTS RESOLVER CALLED");
      const { page = 1, limit = 5, status, tag, search } = args || {};

      const query = {};

      if (status) query.status = status;
      if (tag) query.tags = tag;

      if (search) {
        query.$or = [
          {
            title: { $regex: search, $options: "i" },
          },
          {
            content: { $regex: search, $options: "i" },
          },
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
    } catch (err) {
      console.log("POSTS ERROR:", err);
      return {
        posts: [],
        totalCount: 0,
        hasNextPage: false,
      };
    }
  },

  createPost: async ({ input }, context) => {
    requireAuth(context);

    const { title, content, tags, imageUrl, status } = input;

    if (!title || title.length < 3) {
      throw new AppError("Title too short", "BAD_USER_INPUT", 400);
    }

    if (!content || content.length < 10) {
      throw new AppError("Content too short", "BAD_USER_INPUT", 400);
    }

    const post = await Post.create({
      title,
      content,
      tags: tags || [],
      imageUrl: imageUrl || null,
      status: status || "DRAFT",
      author: context.userId,
    });

    return await Post.findById(post._id).populate("author");
  },

  updatePost: async ({ id, input }, context) => {
    requireAuth(context);

    const post = await Post.findById(id);

    if (!post) {
      throw new AppError("Post not found", "NOT_FOUND", 404);
    }

    if (post.author.toString() !== context.userId) {
      throw new AppError("Not allowed", "FORBIDDEN", 403);
    }

    return await Post.findByIdAndUpdate(
      id,
      { $set: input },
      { new: true },
    ).populate("author");
  },

  deletePost: async ({ id }, context) => {
    requireAuth(context);

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
};

module.exports = postResolvers;
