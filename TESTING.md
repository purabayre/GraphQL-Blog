# GraphQL Blog API Testing

## 1. register + login

### register

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

### login

```graphql
mutation {
  login(email: "jane@example.com", password: "password123") {
    token
    userId
  }
}
```

## 2. createPost

### create post without image

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
    author {
      _id
      name
    }
  }
}
```

## 3. posts with tag + search

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
    }
  }
}
```

## 4. updatePost owner success / non-owner forbidden

### owner update

```graphql
mutation {
  updatePost(id: "<post-id>", input: { title: "Updated title" }) {
    _id
    title
  }
}
```

### non-owner update

- Should return `FORBIDDEN` with HTTP status `403`

## 5. likePost toggle

```graphql
mutation {
  likePost(postId: "<post-id>") {
    _id
    likesCount
  }
}
```

- Call twice: first adds like, second removes like.

## 6. addComment + deleteComment

### add comment

```graphql
mutation {
  addComment(postId: "<post-id>", body: "Nice post!") {
    _id
    body
    author {
      _id
      name
    }
  }
}
```

### delete comment

```graphql
mutation {
  deleteComment(postId: "<post-id>", commentId: "<comment-id>")
}
```

## 7. protected mutation without token

### example

```graphql
mutation {
  createPost(input: { title: "Unauthorized", content: "No token" }) {
    _id
  }
}
```

- Should return `UNAUTHENTICATED` with HTTP status `401`

## 8. publishPost on a draft

```graphql
mutation {
  publishPost(id: "<draft-post-id>") {
    _id
    status
  }
}
```

- Result should include `status: PUBLISHED`
