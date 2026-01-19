const express = require("express");
const path = require("path");
const fs = require("fs");
const cors = require("cors");

const app = express();
const PORT = 8000;
const host = "https://pubvault.bprcahayafajar.co.id";

/* =======================
   MIDDLEWARE
======================= */
app.use(cors());
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true, limit: "5mb" }));

/* =======================
   UPLOAD ROOT
======================= */
const uploadRoot = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadRoot)) {
  fs.mkdirSync(uploadRoot, { recursive: true });
}

app.use("/uploads", express.static(uploadRoot));

/* =======================
   HELPER
======================= */

// baca semua file & subfolder
function readAllFiles(dir, baseUrl = "/uploads") {
  let results = [];
  const list = fs.readdirSync(dir);

  list.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      results = results.concat(
        readAllFiles(filePath, `${baseUrl}/${file}`)
      );
    } else {
      results.push({
        name: file,
        url: `${host}${baseUrl}/${file}`,
        path: `${baseUrl}/${file}`,
        modified: stat.mtime,
        size: stat.size,
      });
    }
  });

  return results;
}

// format ukuran file
function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

// mapping mime → ekstensi
const extMap = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "application/pdf": "pdf",
};

/* =======================
   ROUTES
======================= */

// root
app.get("/", (req, res) => {
  res.send(`
    <h2>🚀 PubVault Server Running</h2>
    <ul>
      <li><a href="/files">📂 List Files</a></li>
    </ul>
  `);
});

/* =======================
   BASE64 UPLOAD (SINGLE)
======================= */
app.post("/upload-base64", (req, res) => {
  const { data, path: relativePath = "" } = req.body;

  if (!data) {
    return res.status(400).json({ message: "Base64 data kosong" });
  }

  // validasi base64
  const match = data.match(/^data:(.+);base64,(.+)$/);
  if (!match) {
    return res.status(400).json({ message: "Format base64 tidak valid" });
  }

  const mime = match[1];
  const base64Data = match[2];
  const ext = extMap[mime] || "bin";

  const buffer = Buffer.from(base64Data, "base64");

  // limit ukuran 3MB
  if (buffer.length > 3 * 1024 * 1024) {
    return res.status(413).json({ message: "File max 3MB" });
  }

  // folder tujuan
  const folderPath = relativePath
    ? path.join(uploadRoot, relativePath)
    : uploadRoot;

  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
  }

  const filename = `file-${Date.now()}.${ext}`;
  const filePath = path.join(folderPath, filename);

  fs.writeFileSync(filePath, buffer);

  const urlPath = relativePath
    ? `/uploads/${relativePath}/${filename}`
    : `/uploads/${filename}`;

  res.json({
    message: "Upload base64 berhasil",
    filename,
    size: buffer.length,
    path: relativePath || "/",
    url: `${host}${urlPath}`,
  });
});

/* =======================
   LIST FILES
======================= */
app.get("/files", (req, res) => {
  const allFiles = readAllFiles(uploadRoot);

  if (allFiles.length === 0) {
    return res.send("<h3>Tidak ada file</h3>");
  }

  allFiles.sort((a, b) => new Date(b.modified) - new Date(a.modified));

  const html = allFiles
    .map((f) => {
      const modified = new Date(f.modified).toLocaleString("id-ID", {
        timeZone: "Asia/Jakarta",
        hour12: false,
      });

      return `
      <div style="margin:10px;padding:10px;border:1px solid #ddd;border-radius:8px;width:260px">
        <a href="${f.url}" target="_blank"><b>${f.name}</b></a><br>
        <small>${f.path}</small><br>
        <small>🕓 ${modified}</small><br>
        <small>💾 ${formatFileSize(f.size)}</small>
      </div>`;
    })
    .join("");

  res.send(`
    <h2>📂 Semua File</h2>
    <div style="display:flex;flex-wrap:wrap">${html}</div>
  `);
});

/* =======================
   START SERVER
======================= */
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running at ${host}:${PORT}`);
});
