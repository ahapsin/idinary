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

// Folder upload
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

// Konfigurasi multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

// Static file serve
app.use("/uploads", express.static(uploadDir));

app.get("/", (req, res) => {
  res.send("Server aktif ✅ <br/><a href='/files'>Telusuri semua file</a>");
});

app.post("/upload", upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ message: "No file uploaded." });

  res.json({
    message: "File uploaded successfully.",
    filename: req.file.filename,
    path: `/uploads/${req.file.filename}`,
    url: `${host}/uploads/${req.file.filename}`,
  });
});

app.post("/upload-multiple", upload.array("files", 5), (req, res) => {
  if (!req.files || req.files.length === 0)
    return res.status(400).json({ message: "No files uploaded." });

  const files = req.files.map((file) => ({
    filename: file.filename,
    path: `/uploads/${file.filename}`,
    url: `${host}/uploads/${file.filename}`,
  }));

  res.json({ message: "Files uploaded successfully.", files });
});

// 🔍 Fungsi rekursif untuk baca semua file dan folder
function readAllFiles(dir, baseUrl = "/uploads") {
  let results = [];

  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      // Folder → baca isi anak-anaknya juga
      results.push({
        type: "folder",
        name: file,
        path: `${baseUrl}/${file}`,
        children: readAllFiles(filePath, `${baseUrl}/${file}`),
      });
    } else {
      // File → masukkan URL-nya
      results.push({
        type: "file",
        name: file,
        path: `${baseUrl}/${file}`,
        url: `${host}${baseUrl}/${file}`,
      });
    }
  });

  return results;
}

// 📁 Route tampilkan seluruh file & folder
app.get("/files", (req, res) => {
  try {
    const structure = readAllFiles(uploadDir);
    res.json(structure);
  } catch (err) {
    console.error(err);
    res.status(500).send("Gagal membaca folder uploads");
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running at ${host}:${PORT}`);
});
