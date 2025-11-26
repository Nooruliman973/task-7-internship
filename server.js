const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const sqlite3 = require("sqlite3").verbose();
const fs = require("fs");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve frontend statically (optional)
app.use("/", express.static(path.join(__dirname, "..", "frontend")));

// Ensure data directory exists
const dataDir = path.join(__dirname, "data");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);

// SQLite DB file
const DB_PATH = path.join(dataDir, "app.db");
const db = new sqlite3.Database(DB_PATH);

// Create table if not exists
const createTableSQL = `
CREATE TABLE IF NOT EXISTS items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);`;
db.run(createTableSQL);

// ------- CRUD API -------

// Read all items
app.get("/api/items", (req, res) => {
  const sql = "SELECT * FROM items ORDER BY created_at DESC";
  db.all(sql, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Read single item
app.get("/api/items/:id", (req, res) => {
  const id = req.params.id;
  db.get("SELECT * FROM items WHERE id = ?", [id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: "Item not found" });
    res.json(row);
  });
});

// Create new item
app.post("/api/items", (req, res) => {
  const { title, description } = req.body;
  if (!title || !title.trim()) return res.status(400).json({ error: "Title is required" });
  const sql = "INSERT INTO items (title, description) VALUES (?, ?)";
  db.run(sql, [title.trim(), description || ""], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    // return newly created item (id available via this.lastID)
    db.get("SELECT * FROM items WHERE id = ?", [this.lastID], (err2, row) => {
      if (err2) return res.status(500).json({ error: err2.message });
      res.status(201).json(row);
    });
  });
});

// Update item
app.put("/api/items/:id", (req, res) => {
  const id = req.params.id;
  const { title, description } = req.body;
  if (!title || !title.trim()) return res.status(400).json({ error: "Title is required" });

  const sql = "UPDATE items SET title = ?, description = ? WHERE id = ?";
  db.run(sql, [title.trim(), description || "", id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: "Item not found" });

    db.get("SELECT * FROM items WHERE id = ?", [id], (err2, row) => {
      if (err2) return res.status(500).json({ error: err2.message });
      res.json(row);
    });
  });
});

// Delete item
app.delete("/api/items/:id", (req, res) => {
  const id = req.params.id;
  db.run("DELETE FROM items WHERE id = ?", [id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: "Item not found" });
    res.json({ success: true });
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
