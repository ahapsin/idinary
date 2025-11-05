const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const cors = require("cors"); // ⬅️ Tambahkan ini

const app = express();
const PORT = 3000;
const host="https://source.bprcahayafajar.co.id"

// ✅ Aktifkan CORS untuk semua origin
app.use(cors());

// pastikan folder uploads ada
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Konfigurasi multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + "-" + uniqueSuffix + ext);
  },
});

const upload = multer({ storage });

// Middleware
app.use(express.json());
app.use("/uploads", express.static(uploadDir)); // agar bisa diakses via URL

// Route root
app.get("/", (req, res) => {
  res.send("Hello server is really running now!");
});

// Route upload (single file)
app.post("/upload", upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded." });
  }

  res.json({
    message: "File uploaded successfully.",
    filename: req.file.filename,
    path: `/public/${req.file.filename}`,
    url: `http://localhost:${PORT}/uploads/${req.file.filename}`,
  });
});

// Route upload multiple files
app.post("/upload-multiple", upload.array("files", 5), (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ message: "No files uploaded." });
  }

  const files = req.files.map((file) => ({
    filename: file.filename,
    path: `/uploads/${file.filename}`,
    url: `http://localhost:${PORT}/uploads/${file.filename}`,
  }));

  res.json({
    message: "Files uploaded successfully.",
    files,
  });
});

// 📂 Route daftar file yang sudah diupload
app.get("/files", (req, res) => {
  fs.readdir(uploadDir, (err, files) => {
    if (err) return res.status(500).send("Gagal membaca folder uploads");

    if (files.length === 0) {
      return res.send(
        '<h3>Tidak ada file yang diupload.</h3><p><a href="/upload-form">Upload sekarang</a></p>'
      );
    }

    const fileList = files
      .map((file) => {
        const fileUrl = `/uploads/${file}`;
        const ext = path.extname(file).toLowerCase();
        const isImage = [".png", ".jpg", ".jpeg", ".gif", ".webp"].includes(
          ext
        );

        return `
        <div style="margin:10px;padding:10px;border:1px solid #ddd;border-radius:8px;display:inline-block;text-align:center;">
          ${
            isImage
              ? `<img src="${fileUrl}" width="150" style="display:block;margin-bottom:8px;border-radius:4px;" />`
              : "📄"
          }
          <a href="${fileUrl}" target="_blank">${file}</a>
        </div>
      `;
      })
      .join("");

    res.send(`
      <h2>📂 Files</h2>
      <div style="display:flex;flex-wrap:wrap;gap:10px;">${fileList}</div>
    `);
  });
});

// Jalankan server
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running at ${host}:${PORT}`);
});
