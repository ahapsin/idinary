const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const cors = require("cors");

const app = express();
const PORT = 8000;
const host = "https://pubvault.bprcahayafajar.co.id";

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

// Pastikan folder uploads ada
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

// Konfigurasi multer (maks 3MB)
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + "-" + uniqueSuffix + ext);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 3 * 1024 * 1024 }, // ⬅️ batas 3 MB
});

app.use("/uploads", express.static(uploadDir));

app.get("/", (req, res) => {
  res.send("✅ Server aktif! <br/><a href='/files'>Lihat file</a>");
});

app.post("/upload", upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ message: "No file uploaded" });

  res.json({
    message: "File uploaded successfully",
    filename: req.file.filename,
    url: `${host}/uploads/${req.file.filename}`,
  });
});

// Jalankan server
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running at ${host}:${PORT}`);
});
