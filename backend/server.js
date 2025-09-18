const express = require("express");
const fs = require("fs");
const path = require("path");
const bodyParser = require("body-parser");
const cors = require("cors");

const DB_FILE = path.join(__dirname, "db.json");

// ---------- Safe DB Read/Write ----------
function readDB() {
  try {
    if (!fs.existsSync(DB_FILE)) {
      const defaultDB = { products: [], sales: [] };
      fs.writeFileSync(DB_FILE, JSON.stringify(defaultDB, null, 2));
      return defaultDB;
    }

    const raw = fs.readFileSync(DB_FILE, "utf8");
    const data = JSON.parse(raw);

    data.products = Array.isArray(data.products) ? data.products : [];
    data.sales = Array.isArray(data.sales) ? data.sales : [];

    // Sanitize products
    data.products = data.products.map((p) => ({
      id: Number(p.id) || 0,
      name: p.name || "Untitled Product",
      description: p.description || "",
      category: p.category || "Uncategorized",
      price: Number(p.price) || 0,
      quantity: Number(p.quantity) || 0,
      image: p.image || p.imageUrl || "https://via.placeholder.com/150?text=No+Image",
    }));

    // Sanitize sales items
    data.sales = data.sales.map((s) => ({
      ...s,
      items: Array.isArray(s.items)
        ? s.items.map((it) => ({
            productId: Number(it.productId) || 0,
            qty: Number(it.qty) || 0,
            unitPrice: Number(it.unitPrice) || 0,
          }))
        : [],
    }));

    return data;
  } catch (err) {
    console.error("Error reading DB:", err);
    return { products: [], sales: [] };
  }
}

function writeDB(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("Error writing DB:", err);
  }
}

// ---------- Express Setup ----------
const app = express();
app.use(cors());
app.use(bodyParser.json());

// ---------- Products API ----------
app.get("/api/products", (req, res) => {
  const db = readDB();
  res.json(db.products);
});

// Record a sale
app.post("/api/sales", (req, res) => {
  const { items } = req.body;
  if (!items || items.length === 0) {
    return res.status(400).json({ error: "No items provided" });
  }

  const db = readDB();
  const timestamp = new Date().toISOString();

  const sale = {
    id: db.sales.length + 1,
    items,
    timestamp,
  };

  // Update product quantities with safety check
  items.forEach((item) => {
    const product = db.products.find((p) => p.id === item.productId);
    if (product) {
      if (product.quantity < item.qty) {
        return res.status(400).json({ error: `Insufficient stock for product ID ${item.productId}` });
      }
      product.quantity = Math.max(0, product.quantity - item.qty);
    }
  });

  db.sales.push(sale);
  writeDB(db);

  console.log("Sale recorded:", sale); // debug log
  res.json(sale);
});

// Add a new product
app.post("/api/products", (req, res) => {
  try {
    const db = readDB();

    const newId = db.products.length > 0 ? Math.max(...db.products.map(p => p.id)) + 1 : 1;
    const newProduct = {
      id: newId,
      name: req.body.name || "Untitled Product",
      description: req.body.description || "",
      category: req.body.category || "Uncategorized",
      price: Number(req.body.price) || 0,
      quantity: Number(req.body.quantity) || 0,
      image: req.body.image || "https://via.placeholder.com/150?text=No+Image",
    };

    db.products.push(newProduct);
    writeDB(db);

    res.status(201).json(newProduct);
  } catch (err) {
    console.error("Error adding product:", err);
    res.status(500).json({ error: err.message });
  }
});


app.put("/api/products/:id", (req, res) => {
  try {
    const db = readDB();
    const id = Number(req.params.id);
    const idx = db.products.findIndex((p) => p.id === id);
    if (idx === -1) return res.status(404).send("Product not found");

    db.products[idx] = {
      ...db.products[idx],
      ...{
        name: req.body.name ?? db.products[idx].name,
        description: req.body.description ?? db.products[idx].description,
        category: req.body.category ?? db.products[idx].category,
        price: Number(req.body.price) ?? db.products[idx].price,
        quantity: Number(req.body.quantity) ?? db.products[idx].quantity,
        image: req.body.image ?? db.products[idx].image,
      },
    };

    writeDB(db);
    res.json(db.products[idx]);
  } catch (err) {
    console.error("Error updating product:", err);
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/products/:id", (req, res) => {
  try {
    const db = readDB();
    const id = Number(req.params.id);
    db.products = db.products.filter((p) => p.id !== id);
    writeDB(db);
    res.sendStatus(204);
  } catch (err) {
    console.error("Error deleting product:", err);
    res.status(500).json({ error: err.message });
  }
});

// ---------- Sales API ----------
app.get("/api/sales", (req, res) => {
  const db = readDB();
  res.json(db.sales);
});

// ---------- Reports API ----------
app.get("/api/reports/summary", (req, res) => {
  try {
    const db = readDB();
    const revByItem = {};

    db.sales.forEach((sale) => {
      (sale.items || []).forEach((it) => {
        if (!it.productId || !it.qty || !it.unitPrice) return;
        revByItem[it.productId] =
          revByItem[it.productId] || { productId: it.productId, qty: 0, revenue: 0 };
        revByItem[it.productId].qty += it.qty;
        revByItem[it.productId].revenue += it.qty * it.unitPrice;
      });
    });

    const report = Object.values(revByItem).map((r) => {
      const p = db.products.find((x) => x.id === r.productId);
      return {
        ...r,
        name: p ? p.name : "Deleted Product",
      };
    });

    const totalRevenue = report.reduce((s, i) => s + i.revenue, 0);
    const topSelling = [...report].sort((a, b) => b.qty - a.qty).slice(0, 5);

    res.json({ report, totalRevenue, topSelling });
  } catch (err) {
    console.error("Error generating report:", err);
    res.status(500).json({ error: err.message });
  }
});

// ---------- Start Server ----------
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log("Server running on port " + PORT));
