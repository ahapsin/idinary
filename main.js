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
  res.send("Server aktif ✅ <br/><a href='/files'>📂 Telusuri semua file</a>");
});

// Upload routes
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
  if (!req.files?.length) return res.status(400).json({ message: "No files uploaded." });

  const files = req.files.map((file) => ({
    filename: file.filename,
    path: `/uploads/${file.filename}`,
    url: `${host}/uploads/${file.filename}`,
  }));

  res.json({ message: "Files uploaded successfully.", files });
});

// 🔍 Fungsi rekursif baca semua file & folder
function readAllFiles(dir, baseUrl = "/uploads") {
  let results = [];
  const list = fs.readdirSync(dir);

  list.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    const ext = path.extname(file).toLowerCase();
    const isImage = [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"].includes(ext);

    if (stat.isDirectory()) {
      results.push({
        type: "folder",
        name: file,
        path: `${baseUrl}/${file}`,
        children: readAllFiles(filePath, `${baseUrl}/${file}`),
      });
    } else {
      results.push({
        type: "file",
        name: file,
        path: `${baseUrl}/${file}`,
        url: `${host}${baseUrl}/${file}`,
        isImage,
      });
    }
  });

  return results;
}

// 🔧 Fungsi buat HTML pohon file/folder
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
              <li style="margin:4px 0;">
                ${item.isImage
                  ? `<a href="${item.url}" target="_blank">
                      <img src="${item.url}" width="100" style="border-radius:6px; vertical-align:middle; margin-right:6px;" />
                    </a>`
                  : "📄 "}
                <a href="${item.url}" target="_blank" style="text-decoration:none; color:#333;">${item.name}</a>
              </li>
            `;
          }
        })
        .join("")}
    </ul>
  `;
}

// 📁 Route tampilkan file dalam HTML interaktif
app.get("/files", (req, res) => {
  try {
    const structure = readAllFiles(uploadDir);
    const html = `
      <html>
      <head>
        <title>📂 File Explorer</title>
        <style>
          body {
            font-family: "Segoe UI", sans-serif;
            background: #f9f9f9;
            color: #333;
            padding: 20px;
          }
          h1 { color: #0366d6; }
          summary:hover { text-decoration: underline; }
          img { box-shadow: 0 2px 6px rgba(0,0,0,0.1); }
        </style>
      </head>
      <body>
        <h1>📂 File Explorer</h1>
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

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running at ${host}:${PORT}`);
});
