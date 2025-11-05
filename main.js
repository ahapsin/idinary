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

// 🔁 Rekursif baca semua file dan subfolder
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
      });
    }
  });
  return results;
}

// ⚙️ Konfigurasi multer dinamis (pakai path dari body)
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
  limits: { fileSize: 3 * 1024 * 1024 }, // Maks 3MB
});

app.use("/uploads", express.static(uploadRoot));

// 🏠 Route utama
app.get("/", (req, res) => {
  res.send(
    `<h2>🚀 Server running!</h2>
    <a href="/files">📂 Lihat semua file</a>`
  );
});

// 📤 Upload file tunggal
app.post("/upload", upload.single("file"), (req, res) => {
  if (!req.file)
    return res.status(400).json({ message: "Tidak ada file yang diupload." });

  const relativePath = req.body.path?.trim() || "";
  const folderUrl = relativePath ? `/uploads/${relativePath}` : `/uploads`;

  res.json({
    message: "File uploaded successfully.",
    path: relativePath || "/",
    filename: req.file.filename,
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
    fullPath: `${folderUrl}/${file.filename}`,
    url: `${host}${folderUrl}/${file.filename}`,
  }));

  res.json({
    message: "Files uploaded successfully.",
    path: relativePath || "/",
    files,
  });
});

// 📁 Tampilkan semua file dan subfolder
app.get("/files", (req, res) => {
  const allFiles = readAllFiles(uploadRoot);

  if (allFiles.length === 0)
    return res.send("<h3>Tidak ada file yang diupload.</h3>");

  const htmlList = allFiles
    .map(
      (f) => `
    <div style="margin:10px;padding:10px;border:1px solid #ddd;border-radius:8px;display:inline-block;text-align:center;">
      <a href="${f.url}" target="_blank">${f.name}</a><br>
      <small>${f.path}</small>
    </div>`
    )
    .join("");

  res.send(`<h2>📂 Semua File dan Folder</h2>
            <div style="display:flex;flex-wrap:wrap;gap:10px;">${htmlList}</div>`);
});

// 🚀 Jalankan server
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running at ${host}:${PORT}`);
});
