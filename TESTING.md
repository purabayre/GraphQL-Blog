# GraphQL Blog API Testing

This document lists the required GraphiQL operations and expected outputs for the GraphQL Blog Platform API.

## 1. register + login

### register mutation

**Query:**

```graphql
mutation {
  register(
    input: {
      name: "Jane Doe"
      email: "jane@example.com"
      password: "password123"
    }
  ) {
    token
    userId
  }
}
```

**Expected Response:**

```json
{
  "data": {
    "register": {
      "token": "<jwt-token>",
      "userId": "<user-id>"
    }
  }
}
```

### login mutation

**Query:**

```graphql
mutation {
  login(email: "jane@example.com", password: "password123") {
    token
    userId
  }
}
```

**Expected Response:**

```json
{
  "data": {
    "login": {
      "token": "<jwt-token>",
      "userId": "<user-id>"
    }
  }
}
```

**Error Response (invalid credentials):**

```json
{
  "errors": [
    {
      "message": "Invalid credentials",
      "extensions": {
        "code": "UNAUTHENTICATED",
        "statusCode": 401
      }
    }
  ]
}
```

---

## 2. createPost (with and without imageUrl)

### create post without image

**Query:**

```graphql
mutation {
  createPost(
    input: {
      title: "My First Post"
      content: "This is the body of my first post."
      tags: ["intro"]
      status: PUBLISHED
    }
  ) {
    _id
    title
    content
    status
    tags
    imageUrl
    likesCount
    author {
      _id
      name
    }
  }
}
```

**Expected Response:**

```json
{
  "data": {
    "createPost": {
      "_id": "<post-id>",
      "title": "My First Post",
      "content": "This is the body of my first post.",
      "status": "PUBLISHED",
      "tags": ["intro"],
      "imageUrl": null,
      "likesCount": 0,
      "author": {
        "_id": "<user-id>",
        "name": "Jane Doe"
      }
    }
  }
}
```

### create post with image

**REST Upload:**

```bash
POST /upload
Content-Type: multipart/form-data
Authorization: Bearer <token>

Form Data:
  image: <binary-file>
```

**Upload Response:**

```json
{
  "imageUrl": "/uploads/images/<filename>.jpg"
}
```

**Query:**

```graphql
mutation {
  createPost(
    input: {
      title: "Post with Image"
      content: "This post has a featured image."
      imageUrl: "/uploads/images/<filename>.jpg"
      tags: ["image", "feature"]
      status: PUBLISHED
    }
  ) {
    _id
    title
    imageUrl
    tags
  }
}
```

**Expected Response:**

```json
{
  "data": {
    "createPost": {
      "_id": "<post-id>",
      "title": "Post with Image",
      "imageUrl": "/uploads/images/<filename>.jpg",
      "tags": ["image", "feature"]
    }
  }
}
```

---

## 3. posts query with tag + search filters

**Query:**

```graphql
query {
  posts(page: 1, limit: 5, tag: "intro", search: "first") {
    posts {
      _id
      title
      status
      tags
      author {
        name
      }
      likesCount
    }
    totalCount
    hasNextPage
  }
}
```

**Expected Response:**

```json
{
  "data": {
    "posts": {
      "posts": [
        {
          "_id": "<post-id>",
          "title": "My First Post",
          "status": "PUBLISHED",
          "tags": ["intro"],
          "author": {
            "name": "Jane Doe"
          },
          "likesCount": 0
        }
      ],
      "totalCount": 1,
      "hasNextPage": false
    }
  }
}
```

### optional cursor pagination bonus

**Query:**

```graphql
query {
  postsConnection(tag: "intro", search: "first", first: 5) {
    edges {
      cursor
      node {
        _id
        title
        status
      }
    }
    pageInfo {
      endCursor
      hasNextPage
    }
  }
}
```

**Expected Response:**

```json
{
  "data": {
    "postsConnection": {
      "edges": [
        {
          "cursor": "<cursor>",
          "node": {
            "_id": "<post-id>",
            "title": "My First Post",
            "status": "PUBLISHED"
          }
        }
      ],
      "pageInfo": {
        "endCursor": "<cursor>",
        "hasNextPage": false
      }
    }
  }
}
```

---

## 4. updatePost ownership check

### owner update (success)

**Query:**

```graphql
mutation {
  updatePost(id: "<post-id>", input: { title: "Updated Title" }) {
    _id
    title
    updatedAt
  }
}
```

**Expected Response:**

```json
{
  "data": {
    "updatePost": {
      "_id": "<post-id>",
      "title": "Updated Title",
      "updatedAt": "<timestamp>"
    }
  }
}
```

### non-owner update (forbidden)

**Expected Response:**

```json
{
  "errors": [
    {
      "message": "Not allowed",
      "extensions": {
        "code": "FORBIDDEN",
        "statusCode": 403
      }
    }
  ]
}
```

---

## 5. likePost toggle functionality

### first call - add like

**Query:**

```graphql
mutation {
  likePost(postId: "<post-id>") {
    _id
    likesCount
  }
}
```

**Expected Response:**

```json
{
  "data": {
    "likePost": {
      "_id": "<post-id>",
      "likesCount": 1
    }
  }
}
```

### second call - remove like

**Query:**

```graphql
mutation {
  likePost(postId: "<post-id>") {
    _id
    likesCount
  }
}
```

**Expected Response:**

```json
{
  "data": {
    "likePost": {
      "_id": "<post-id>",
      "likesCount": 0
    }
  }
}
```

---

## 6. addComment + deleteComment

### add comment

**Query:**

```graphql
mutation {
  addComment(postId: "<post-id>", body: "Nice post!") {
    _id
    body
    createdAt
    author {
      _id
      name
    }
  }
}
```

**Expected Response:**

```json
{
  "data": {
    "addComment": {
      "_id": "<comment-id>",
      "body": "Nice post!",
      "createdAt": "<timestamp>",
      "author": {
        "_id": "<user-id>",
        "name": "Jane Doe"
      }
    }
  }
}
```

### delete own comment

**Query:**

```graphql
mutation {
  deleteComment(commentId: "<comment-id>")
}
```

**Expected Response:**

```json
{
  "data": {
    "deleteComment": true
  }
}
```

### delete someone else's comment (forbidden)

**Expected Response:**

```json
{
  "errors": [
    {
      "message": "Not allowed",
      "extensions": {
        "code": "FORBIDDEN",
        "statusCode": 403
      }
    }
  ]
}
```

---

## 7. protected mutation without authentication token

**Query:**

```graphql
mutation {
  createPost(
    input: { title: "Unauthorized Post", content: "This should fail" }
  ) {
    _id
  }
}
```

**Expected Response:**

```json
{
  "errors": [
    {
      "message": "Authentication required",
      "extensions": {
        "code": "UNAUTHENTICATED",
        "statusCode": 401
      }
    }
  ]
}
```

---

## 8. publishPost on a draft

### create draft post

**Query:**

```graphql
mutation {
  createPost(
    input: {
      title: "Draft Post"
      content: "This is a draft post."
      status: DRAFT
    }
  ) {
    _id
    status
  }
}
```

**Expected Response:**

```json
{
  "data": {
    "createPost": {
      "_id": "<draft-post-id>",
      "status": "DRAFT"
    }
  }
}
```

### publish draft

**Query:**

```graphql
mutation {
  publishPost(id: "<draft-post-id>") {
    _id
    status
    updatedAt
  }
}
```

**Expected Response:**

```json
{
  "data": {
    "publishPost": {
      "_id": "<draft-post-id>",
      "status": "PUBLISHED",
      "updatedAt": "<timestamp>"
    }
  }
}
```

---

## GraphiQL Testing Instructions

1. Open `http://localhost:3000/graphql`
2. Use the GraphiQL headers pane for authenticated queries:

```json
{
  "Authorization": "Bearer <token>"
}
```

3. Execute the queries and verify the responses.

## Summary of Required Tests

| Test | Scenario                         | Expected GraphQL Code |
| ---- | -------------------------------- | --------------------- |
| 1    | register + login                 | 200                   |
| 2    | createPost with/without image    | 200                   |
| 3    | posts query with filters         | 200                   |
| 4    | updatePost owner vs non-owner    | 200 / 403             |
| 5    | likePost toggle                  | 200                   |
| 6    | addComment + deleteComment       | 200 / 403             |
| 7    | protected mutation without token | 401                   |
| 8    | publishPost on a draft           | 200                   |
