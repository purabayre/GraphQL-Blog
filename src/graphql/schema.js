const { buildSchema } = require("graphql");

module.exports = buildSchema(`

  enum PostStatus {
    DRAFT
    PUBLISHED
  }

  type User {
    _id: ID!
    name: String!
    email: String!
    avatarUrl: String
    posts: [Post!]!
    createdAt: String!
  }

  type Comment {
    _id: ID!
    body: String!
    author: User!
    createdAt: String!
  }

  type Post {
    _id: ID!
    title: String!
    content: String!
    imageUrl: String
    status: PostStatus!
    tags: [String!]!
    author: User!
    likesCount: Int!
    createdAt: String!
    updatedAt: String!

    comments: [Comment!]!
  }

  type AuthPayload {
    token: String!
    userId: String!
  }

  type PaginatedPosts {
    posts: [Post!]!
    totalCount: Int!
    hasNextPage: Boolean!
  }

  type Query {
    hello: String!

    user(id: ID!): User!
    me: User!

    post(id: ID!): Post!

    posts(
      page: Int
      limit: Int
      status: PostStatus
      tag: String
      search: String
    ): PaginatedPosts!
  }

  input RegisterInput {
    name: String!
    email: String!
    password: String!
  }

  input CreatePostInput {
    title: String!
    content: String!
    imageUrl: String
    tags: [String!]
    status: PostStatus
  }

  type Mutation {
    register(input: RegisterInput!): AuthPayload!
    login(email: String!, password: String!): AuthPayload!

    createPost(input: CreatePostInput!): Post!
    updatePost(id: ID!, input: CreatePostInput!): Post!
    deletePost(id: ID!): Boolean!


    addComment(postId: ID!, body: String!): Post!
    deleteComment(postId: ID!, commentId: ID!): Post!

    publishPost(id: ID!): Post!
    unpublishPost(id: ID!): Post!
  }

`);
