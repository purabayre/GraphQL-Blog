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
    comments: [Comment!]!
    likesCount: Int!
    createdAt: String!
    updatedAt: String!
  }

  type AuthPayload {
    token: String!
    userId: String!
  }

  # Cursor-based pagination types
  type PostEdge {
    cursor: ID!
    node: Post!
  }

  type PageInfo {
    endCursor: ID
    hasNextPage: Boolean!
  }

  type PostConnection {
    edges: [PostEdge!]!
    pageInfo: PageInfo!
  }

  type Query {
    hello: String!

    user(id: ID!): User!
    me: User!

    post(id: ID!): Post!

    # Cursor-based pagination
    posts(
      after: ID
      first: Int
      status: PostStatus
      tag: String
      search: String
    ): PostConnection!

    myPosts(
      after: ID
      first: Int
      status: PostStatus
    ): PostConnection!
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

  input UpdatePostInput {
    title: String
    content: String
    imageUrl: String
    tags: [String!]
    status: PostStatus
  }

  input UpdateMeInput {
    name: String
    avatarUrl: String
  }

  type Mutation {
    register(input: RegisterInput!): AuthPayload!
    login(email: String!, password: String!): AuthPayload!

    createPost(input: CreatePostInput!): Post!
    updatePost(id: ID!, input: UpdatePostInput!): Post!
    deletePost(id: ID!): Boolean!
    
    publishPost(id: ID!): Post!
    unpublishPost(id: ID!): Post!

    addComment(postId: ID!, body: String!): Comment!
    deleteComment(commentId: ID!): Boolean!

    likePost(postId: ID!): Post!

    updateMe(input: UpdateMeInput!): User!
  }

  extend type Query {
    relatedPosts(postId: ID!, limit: Int): [Post!]!
  }


`);
