# GraphQL Blog Platform API

A headless blog platform exposed through a GraphQL API and a REST upload endpoint.

## Setup

1. Copy `.env.example` to `.env`.
2. Fill in `MONGO_URI`, `JWT_SECRET`, and optionally `PORT` and `NODE_ENV`.
3. Install dependencies:
   ```bash
   npm install
   ```
4. Start the server:
   ```bash
   npm run dev
   ```

## GraphQL

- GraphQL endpoint: `http://localhost:3000/graphql`
- GraphiQL interface is enabled in non-production mode.
- `posts` and `myPosts` use page/limit pagination and return `posts`, `totalCount`, and `hasNextPage`.
- Bonus cursor pagination is available through `postsConnection` and `myPostsConnection`.
- Send authentication with the HTTP header:
  ```json
  {
    "Authorization": "Bearer <token>"
  }
  ```

## Uploads

- REST endpoint: `POST /upload`
- Use `multipart/form-data` with field `image`
- Header: `Authorization: Bearer <token>`
- Supported image types: `jpg`, `png`, `webp`
- Max file size: 2MB
- Uploaded images are served from `/uploads/images/<filename>`
