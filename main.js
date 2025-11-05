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

// Pastikan folder uploads ada
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

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

app.use("/uploads", express.static(uploadDir));

// 🏠 Root
app.get("/", (req, res) => {
  res.send("✅ Server aktif <br/><a href='/files'>📂 Lihat semua file</a>");
});

// 📤 Upload 1 file
app.post("/upload", upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ message: "No file uploaded." });

  res.json({
    message: "File uploaded successfully.",
    filename: req.file.filename,
    url: `${host}/uploads/${req.file.filename}`,
  });
});

// 📤 Upload multiple
app.post("/upload-multiple", upload.array("files", 5), (req, res) => {
  if (!req.files || req.files.length === 0)
    return res.status(400).json({ message: "No files uploaded." });

  const files = req.files.map((file) => ({
    filename: file.filename,
    url: `${host}/uploads/${file.filename}`,
  }));

  res.json({ message: "Files uploaded successfully.", files });
});

// 🔍 Fungsi baca seluruh file dan subfolder
function readAllFiles(dir, baseUrl = "/uploads") {
  const items = [];
  const list = fs.readdirSync(dir);

  list.forEach((name) => {
    const filePath = path.join(dir, name);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      items.push({
        type: "folder",
        name,
        children: readAllFiles(filePath, `${baseUrl}/${name}`),
      });
    } else {
      const ext = path.extname(name).toLowerCase();
      const isImage = [".png", ".jpg", ".jpeg", ".gif", ".webp"].includes(ext);
      items.push({
        type: "file",
        name,
        url: `${host}${baseUrl}/${name}`,
        isImage,
      });
    }
  });

  return items;
}

// 🧩 Render HTML rekursif
function renderTree(items) {
  return `
  <ul style="list-style:none; margin-left:20px; padding-left:10px; border-left:1px dashed #ccc;">
    ${items
      .map((item) => {
        if (item.type === "folder") {
          return `
            <li>
              <details>
                <summary style="cursor:pointer; font-weight:bold; color:#0366d6;">📁 ${item.name}</summary>
                ${renderTree(item.children)}
              </details>
            </li>
          `;
        } else {
          return `
            <li style="margin:6px 0;">
              ${
                item.isImage
                  ? `<a href="${item.url}" target="_blank">
                      <img src="${item.url}" width="100" style="border-radius:6px; vertical-align:middle; margin-right:6px;" />
                    </a>`
                  : "📄 "
              }
              <a href="${item.url}" target="_blank" style="text-decoration:none; color:#333;">${item.name}</a>
            </li>
          `;
        }
      })
      .join("")}
  </ul>`;
}

// 📂 Route tampilkan semua file dan subfolder
app.get("/files", (req, res) => {
  try {
    const structure = readAllFiles(uploadDir);
    const html = `
      <html>
      <head>
        <title>📂 File</title>
        <style>
          body {
            font-family: "Segoe UI", sans-serif;
            background: #f9f9f9;
            color: #333;
            padding: 20px;
          }
          h1 { color: #0366d6; }
          summary:hover { text-decoration: underline; }
          img { box-shadow: 0 2px 6px rgba(0,0,0,0.1); transition: transform .2s; }
          img:hover { transform: scale(1.05); }
        </style>
      </head>
      <body>
        <h1>📂 File</h1>
        <p>Total item: ${structure.length}</p>
        ${renderTree(structure)}
      </body>
      </html>
    `;
    res.send(html);
  } catch (err) {
    console.error(err);
    res.status(500).send("Gagal membaca folder uploads");
  }
});

// 🚀 Jalankan server
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running at ${host}:${PORT}`);
});
