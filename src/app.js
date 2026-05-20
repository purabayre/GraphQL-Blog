require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { createHandler } = require("graphql-http/lib/use/express");
const { ruruHTML } = require("ruru/server");
const schema = require("./graphql/schema");
const rootValue = require("./graphql/resolvers");
const jwtAuth = require("./middleware/jwtAuth");
const uploadRoutes = require("./routes/upload");

const connectDB = require("./config/db");
const app = express();

connectDB();

app.use(cors());
app.use(express.json());
app.use(jwtAuth);

app.get("/graphql", (_req, res) => {
  res.type("html");
  res.end(ruruHTML({ endpoint: "/graphql" }));
});

app.use(
  "/graphql",
  createHandler({
    schema,
    rootValue,
    graphiql: process.env.NODE_ENV !== "production",
    context: (req) => ({
      userId: req.raw.userId,
    }),
    customFormatErrorFn: (error) => {
      const extensions = error.extensions || {};
      return {
        message: error.message,
        extensions: {
          code: extensions.code || "INTERNAL_SERVER_ERROR",
          statusCode: extensions.statusCode || 500,
          details: extensions.details || [],
        },
      };
    },
  }),
);
app.use("/uploads/images", express.static("uploads/images"));
app.use("/upload", uploadRoutes);

app.get("/", (req, res) => {
  res.send("API Running");
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
