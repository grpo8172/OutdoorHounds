import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";

const UPLOADS_DIR = process.env.UPLOADS_DIR || "/app/uploads";

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: UPLOADS_DIR,
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || ".jpg";
    cb(null, crypto.randomUUID().replace(/-/g, "").slice(0, 16) + ext);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024, files: 9 }, // 100MB for video clips, up to 8 photos + 1 video
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/") || file.mimetype.startsWith("video/")) cb(null, true);
    else cb(new Error("Only image and video files are allowed"));
  },
});

export function registerUploadRoutes(app: express.Express) {
  app.use("/api/uploads", express.static(UPLOADS_DIR));

  app.post("/api/upload", upload.array("files", 8), (req, res) => {
    const files = req.files as Express.Multer.File[];
    if (!files?.length) {
      res.status(400).json({ error: "No files uploaded" });
      return;
    }
    res.json({ urls: files.map((f) => `/api/uploads/${f.filename}`) });
  });
}
