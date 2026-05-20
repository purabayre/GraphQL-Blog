const express = require("express");
const multer = require("multer");
const path = require("path");

const requireAuth = require("../utils/requireAuth");

const router = express.Router();

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, "uploads/images");
  },

  filename(req, file, cb) {
    const uniqueName = Date.now() + "-" + Math.round(Math.random() * 1e9);

    cb(null, uniqueName + path.extname(file.originalname));
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = ["image/jpeg", "image/png", "image/webp"];

  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type"), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024,
  },
});

router.post(
  "/",
  (req, res, next) => {
    try {
      requireAuth({ userId: req.userId });
      next();
    } catch (err) {
      return res.status(err.extensions?.statusCode || 401).json({
        message: err.message,
      });
    }
  },
  upload.single("image"),
  (req, res) => {
    if (!req.file) {
      return res.status(400).json({
        message: "No file uploaded",
      });
    }

    return res.status(201).json({
      imageUrl: `/uploads/images/${req.file.filename}`,
    });
  },
);

module.exports = router;
