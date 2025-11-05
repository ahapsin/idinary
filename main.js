const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const cors = require("cors");

const app = express();
const PORT = 8000;
const host = "https://pubvault.bprcahayafajar.co.id";

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const uploadRoot = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadRoot)) fs.mkdirSync(uploadRoot);

// 🔁 Baca semua file dan subfolder + waktu & ukuran
function readAllFiles(dir, baseUrl = "/uploads") {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      results = results.concat(readAllFiles(filePath, `${baseUrl}/${file}`));
    } else {
      results.push({
        name: file,
        url: `${host}${baseUrl}/${file}`,
        path: `${baseUrl}/${file}`,
        modified: stat.mtime,
        size: stat.size, // dalam byte
      });
    }
  });
  return results;
}

// 🔢 Fungsi bantu ubah ukuran file ke format yang mudah dibaca
function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

// ⚙️ Konfigurasi multer dinamis
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    let relativePath = req.body.path ? req.body.path.trim() : "";

    // Jika path kosong → simpan di folder utama "uploads"
    if (!relativePath) {
      cb(null, uploadRoot);
      return;
    }

    const folderPath = path.join(uploadRoot, relativePath);
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }

    cb(null, folderPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + "-" + uniqueSuffix + ext);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 3 * 1024 * 1024 }, // Maksimal 3MB
});

app.use("/uploads", express.static(uploadRoot));

// 🏠 Route utama
app.get("/", (req, res) => {
  res.send(`
    <h2>🚀 Server running!</h2>
    <a href="/files">📂 Lihat semua file</a>
  `);
});

// 📤 Upload satu file
app.post("/upload", upload.single("file"), (req, res) => {
  if (!req.file)
    return res.status(400).json({ message: "Tidak ada file yang diupload." });

  const relativePath = req.body.path?.trim() || "";
  const folderUrl = relativePath ? `/uploads/${relativePath}` : `/uploads`;

  res.json({
    message: "File uploaded successfully.",
    path: relativePath || "/",
    filename: req.file.filename,
    size: req.file.size,
    fullPath: `${folderUrl}/${req.file.filename}`,
    url: `${host}${folderUrl}/${req.file.filename}`,
  });
});

// 📤 Upload banyak file
app.post("/upload-multiple", upload.array("files", 5), (req, res) => {
  if (!req.files || req.files.length === 0)
    return res.status(400).json({ message: "Tidak ada file yang diupload." });

  const relativePath = req.body.path?.trim() || "";
  const folderUrl = relativePath ? `/uploads/${relativePath}` : `/uploads`;

  const files = req.files.map((file) => ({
    filename: file.filename,
    size: file.size,
    fullPath: `${folderUrl}/${file.filename}`,
    url: `${host}${folderUrl}/${file.filename}`,
  }));

  res.json({
    message: "Files uploaded successfully.",
    path: relativePath || "/",
    files,
  });
});

// 📁 Tampilkan semua file (urut terbaru + ukuran + timezone Asia/Jakarta)
app.get("/files", (req, res) => {
  let allFiles = readAllFiles(uploadRoot);

  if (allFiles.length === 0)
    return res.send("<h3>Tidak ada file yang diupload.</h3>");

  // Urutkan berdasarkan waktu terbaru
  allFiles.sort((a, b) => new Date(b.modified) - new Date(a.modified));

  const htmlList = allFiles
    .map((f) => {
      const modifiedJakarta = new Date(f.modified).toLocaleString("id-ID", {
        timeZone: "Asia/Jakarta",
        hour12: false,
      });

      return `
      <div style="margin:10px;padding:10px;border:1px solid #ddd;border-radius:8px;display:inline-block;text-align:left;width:240px;">
        <a href="${f.url}" target="_blank" style="font-weight:bold;">${f.name}</a><br>
        <small style="color:#666;">${f.path}</small><br>
        <small>🕓 ${modifiedJakarta}</small><br>
        <small>💾 ${formatFileSize(f.size)}</small>
      </div>`;
    })
    .join("");

  res.send(`
    <h2>📂 Semua File dan Folder</h2>
    <div style="display:flex;flex-wrap:wrap;gap:10px;">${htmlList}</div>
  `);
});

// 🚀 Jalankan server
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running at ${host}:${PORT} (Asia/Jakarta time)`);
});
