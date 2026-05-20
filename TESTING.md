# GraphQL Blog API Testing

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

**Expected Response (200 OK):**

```json
{
  "data": {
    "register": {
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "userId": "507f1f77bcf86cd799439011"
    }
  }
}
```

**Notes:**

- Token is a valid JWT that can be used in subsequent requests
- userId is the MongoDB ObjectId of the newly created user

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

**Expected Response (200 OK):**

```json
{
  "data": {
    "login": {
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "userId": "507f1f77bcf86cd799439011"
    }
  }
}
```

**Error Response (invalid credentials, 401):**

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
      title: "First Post"
      content: "This is the body of the first post."
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

**Expected Response (200 OK):**

```json
{
  "data": {
    "createPost": {
      "_id": "507f1f77bcf86cd799439012",
      "title": "First Post",
      "content": "This is the body of the first post.",
      "status": "PUBLISHED",
      "tags": ["intro"],
      "imageUrl": null,
      "likesCount": 0,
      "author": {
        "_id": "507f1f77bcf86cd799439011",
        "name": "Jane Doe"
      }
    }
  }
}
```

### create post with image

**Prerequisites:** First upload an image via REST endpoint:

**REST Upload:**

```bash
POST /upload
Content-Type: multipart/form-data
Authorization: Bearer <token>

Form Data:
  image: <binary-file>
```

**Upload Response (201 Created):**

```json
{
  "imageUrl": "/uploads/images/1716230400000-123456789.jpg"
}
```

**Query (with imageUrl):**

```graphql
mutation {
  createPost(
    input: {
      title: "Post with Image"
      content: "This post has a featured image."
      imageUrl: "/uploads/images/1716230400000-123456789.jpg"
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

**Expected Response (200 OK):**

```json
{
  "data": {
    "createPost": {
      "_id": "507f1f77bcf86cd799439013",
      "title": "Post with Image",
      "imageUrl": "/uploads/images/1716230400000-123456789.jpg",
      "tags": ["image", "feature"]
    }
  }
}
```

---

## 3. posts query with tag + search filters

### combined tag and search filter

**Query:**

```graphql
query {
  posts(tag: "intro", search: "first", page: 1, limit: 5) {
    totalCount
    hasNextPage
    posts {
      _id
      title
      status
      tags
      author {
        name
      }
    }
  }
}
```

**Expected Response (200 OK):**

```json
{
  "data": {
    "posts": {
      "totalCount": 1,
      "hasNextPage": false,
      "posts": [
        {
          "_id": "507f1f77bcf86cd799439012",
          "title": "First Post",
          "status": "PUBLISHED",
          "tags": ["intro"],
          "author": {
            "name": "Jane Doe"
          }
        }
      ]
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
  updatePost(
    id: "507f1f77bcf86cd799439012"
    input: { title: "Updated Title" }
  ) {
    _id
    title
    updatedAt
  }
}
```

**Expected Response (200 OK):**

```json
{
  "data": {
    "updatePost": {
      "_id": "507f1f77bcf86cd799439012",
      "title": "Updated Title",
      "updatedAt": "2026-05-20T10:30:45.123Z"
    }
  }
}
```

### non-owner update (forbidden)

**Scenario:** Different user (different token) attempts to update the post

**Expected Response (200 with GraphQL error):**

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
  likePost(postId: "507f1f77bcf86cd799439012") {
    _id
    likesCount
    author {
      name
    }
  }
}
```

**Expected Response (200 OK):**

```json
{
  "data": {
    "likePost": {
      "_id": "507f1f77bcf86cd799439012",
      "likesCount": 1,
      "author": {
        "name": "Jane Doe"
      }
    }
  }
}
```

### second call - remove like (toggle)

**Query (same as above):**

```graphql
mutation {
  likePost(postId: "507f1f77bcf86cd799439012") {
    _id
    likesCount
  }
}
```

**Expected Response (200 OK):**

```json
{
  "data": {
    "likePost": {
      "_id": "507f1f77bcf86cd799439012",
      "likesCount": 0
    }
  }
}
```

**Notes:**

- likesCount went from 1 to 0, confirming the like was removed
- Calling again would add it back

---

## 6. addComment + deleteComment

### add comment

**Query:**

```graphql
mutation {
  addComment(postId: "507f1f77bcf86cd799439012", body: "Nice post!") {
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

**Expected Response (200 OK):**

```json
{
  "data": {
    "addComment": {
      "_id": "507f1f77bcf86cd799439014",
      "body": "Nice post!",
      "createdAt": "2026-05-20T10:35:20.000Z",
      "author": {
        "_id": "507f1f77bcf86cd799439011",
        "name": "Jane Doe"
      }
    }
  }
}
```

### delete own comment (success)

**Query:**

```graphql
mutation {
  deleteComment(
    postId: "507f1f77bcf86cd799439012"
    commentId: "507f1f77bcf86cd799439014"
  )
}
```

**Expected Response (200 OK):**

```json
{
  "data": {
    "deleteComment": true
  }
}
```

### delete someone else's comment (forbidden)

**Scenario:** User attempts to delete a comment they did not write

**Expected Response (200 with GraphQL error):**

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

### createPost without token

**Query (no Authorization header):**

```graphql
mutation {
  createPost(
    input: { title: "Unauthorized Post", content: "This should fail" }
  ) {
    _id
  }
}
```

**Expected Response (200 with GraphQL error):**

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

### other protected mutations without token

All of these should return `UNAUTHENTICATED` (401):

- `updatePost`
- `deletePost`
- `publishPost`
- `unpublishPost`
- `likePost`
- `addComment`
- `deleteComment`
- `myPosts` query

---

## 8. publishPost - change status from DRAFT to PUBLISHED

### create draft post first

**Query:**

```graphql
mutation {
  createPost(
    input: { title: "Draft Post", content: "This is a draft.", status: DRAFT }
  ) {
    _id
    status
  }
}
```

**Expected Response (200 OK):**

```json
{
  "data": {
    "createPost": {
      "_id": "507f1f77bcf86cd799439015",
      "status": "DRAFT"
    }
  }
}
```

### publish the draft post

**Query:**

```graphql
mutation {
  publishPost(id: "507f1f77bcf86cd799439015") {
    _id
    status
    updatedAt
  }
}
```

**Expected Response (200 OK):**

```json
{
  "data": {
    "publishPost": {
      "_id": "507f1f77bcf86cd799439015",
      "status": "PUBLISHED",
      "updatedAt": "2026-05-20T10:40:00.000Z"
    }
  }
}
```

### unpublish back to draft

**Query:**

```graphql
mutation {
  unpublishPost(id: "507f1f77bcf86cd799439015") {
    _id
    status
    updatedAt
  }
}
```

**Expected Response (200 OK):**

```json
{
  "data": {
    "unpublishPost": {
      "_id": "507f1f77bcf86cd799439015",
      "status": "DRAFT",
      "updatedAt": "2026-05-20T10:40:15.000Z"
    }
  }
}
```

---

## How to Test in GraphiQL

1. Open `http://localhost:3000/graphql` in your browser
2. For authenticated requests, add a headers panel with:

```json
{
  "Authorization": "Bearer <your-jwt-token>"
}
```

3. Copy and paste each query/mutation into the editor
4. Click "Play" or press Ctrl+Enter to execute
5. Check the response in the right panel

## Summary of Test Coverage

| Test | Scenario                         | Status Code |
| ---- | -------------------------------- | ----------- |
| 1    | register/login happy path        | 200         |
| 2    | createPost with/without image    | 200         |
| 3    | posts query with filters         | 200         |
| 4    | updatePost owner vs non-owner    | 200/403     |
| 5    | likePost toggle                  | 200         |
| 6    | addComment/deleteComment         | 200/403     |
| 7    | protected mutation without token | 401         |
| 8    | publishPost/unpublishPost        | 200         |
