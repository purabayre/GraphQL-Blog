require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { createHandler } = require("graphql-http/lib/use/express");
const { ruruHTML } = require("ruru/server");
const schema = require("./graphql/schema");
const rootValue = require("./graphql/resolvers");
const jwtAuth = require("./middleware/jwtAuth");

const connectDB = require("./config/db");
const app = express();

connectDB();

app.use(cors());
app.use(express.json());
app.use(jwtAuth);

app.get("/graphiql", (_req, res) => {
  res.type("html");
  res.end(ruruHTML({ endpoint: "/graphql" }));
});

app.use(
  "/graphql",
  createHandler({
    schema,
    rootValue,

    context: (req) => ({
      userId: req.raw.userId,
    }),
  }),
);

app.get("/", (req, res) => {
  res.send("API Running");
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
