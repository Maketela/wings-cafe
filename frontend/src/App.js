// App.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import logo from './assets/wings.png';


const API = "http://localhost:4000/api";


function Footer() {
  return (
    <footer className="footer">
      <div>WingsCafe — All rights reserved.</div>
    </footer>
  );
}

function TopNav({ setView }) {
  return (
    <nav className="topnav">
      <img src={logo} alt="WingsCafe Logo" className="logo" />
      <button onClick={() => setView("dashboard")}>Dashboard</button>
      <button onClick={() => setView("sales")}>Sales</button>
      <button onClick={() => setView("products")}>Products</button>
      <button onClick={() => setView("inventory")}>Inventory</button>
      <button onClick={() => setView("reports")}>Reports</button>
    </nav>
  );
}


/* ---------------- Dashboard ---------------- */
function Dashboard({ products }) {
  return (
    <div className="dashboard">
      <h2>Products</h2>
      <div className="cards">
        {products.map((p) => (
          <div key={p.id} className={`card ${p.quantity <= 5 ? "low" : ""}`}>
            <img
              src={p.image || "https://via.placeholder.com/150?text=No+Image"}
              alt={p.name}
              style={{ width: "100%", height: 180, objectFit: "cover" }}
            />
            <div className="card-body" style={{ textAlign: "center" }}>
              <h3>{p.name}</h3>
              <p>{p.description}</p>
              <div
                className="meta"
                style={{
                  color: p.quantity <= 5 ? "var(--danger)" : "var(--muted)",
                  fontWeight: 600,
                }}
              >
                {p.quantity} left • LSL {p.price.toFixed(2)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


/* ---------------- Sales ---------------- */
function Sales({ products, onRecordSale }) {
  const [cart, setCart] = useState([]);

  function addToCart(product) {
    setCart((prev) => {
      const found = prev.find((i) => i.productId === product.id);
      if (found)
        return prev.map((i) =>
          i.productId === product.id ? { ...i, qty: i.qty + 1 } : i
        );
      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          unitPrice: product.price,
          qty: 1,
        },
      ];
    });
  }

  function changeQty(productId, qty) {
    setCart((prev) =>
      prev.map((i) =>
        i.productId === productId ? { ...i, qty: Math.max(1, qty) } : i
      )
    );
  }

  function removeItem(productId) {
    setCart((prev) => prev.filter((i) => i.productId !== productId));
  }

  const total = cart.reduce((s, i) => s + i.qty * i.unitPrice, 0);

 async function handleCheckout() {
  if (cart.length === 0) return alert("Cart empty");
  const payload = { items: cart };
  try {
    console.log('Sending payload to /sales:', payload); // Log payload
    const response = await axios.post(API + "/sales", payload);
    console.log('Response:', response.data);
    setCart([]);
    onRecordSale && onRecordSale();
    alert("Sale recorded");
  } catch (error) {
    console.error('Error recording sale:', error.response?.data || error.message);
    alert('Failed to record sale: ' + (error.response?.data?.error || error.message));
  }
}

  return (
    <div className="sales">
      <h2>Sales — Click a product to add to cart</h2>
      <div className="sales-layout">
        <div className="product-list">
          {products.map((p) => (
            <div
              key={p.id}
              className={`sale-card ${p.quantity <= 0 ? "disabled" : ""}`}
              onClick={() => p.quantity > 0 && addToCart(p)}
            >
              <img src={p.image} alt="" />
              <div>
                {p.name} — LSL {p.price.toFixed(2)}
              </div>
            </div>
          ))}
        </div>
        <div className="cart">
          <h3>Cart</h3>
          {cart.length === 0 && <div className="empty">No items</div>}
          {cart.map((it) => (
            <div key={it.productId} className="cart-row">
              <div className="cart-name">{it.name}</div>
              <input
                type="number"
                value={it.qty}
                min={1}
                onChange={(e) => changeQty(it.productId, Number(e.target.value))}
              />
              <div>LSL {(it.unitPrice * it.qty).toFixed(2)}</div>
              <button onClick={() => removeItem(it.productId)}>Remove</button>
            </div>
          ))}
          <div className="cart-total">Total: LSL {total.toFixed(2)}</div>
          <button className="checkout" onClick={handleCheckout}>
            Record Sale
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Product Management ---------------- */
function Products({ products, refresh }) {
  const [form, setForm] = useState({
    name: "",
    description: "",
    category: "",
    price: "",
    quantity: "",
  
  });

  async function handleAdd(e) {
  e.preventDefault();
  const payload = {
    ...form,
    price: Number(form.price),
    quantity: Number(form.quantity),
  };
  try {
    console.log('Sending payload to /products:', payload); // Log payload
    const response = await axios.post(API + "/products", payload);
    console.log('Response:', response.data);
    setForm({ name: "", description: "", category: "", price: 0, quantity: 0,  });
    refresh();
  } catch (error) {
    console.error('Error adding product:', error.response?.data || error.message);
    alert('Failed to add product: ' + (error.response?.data?.error || error.message));
  }
}

  async function handleDelete(id) {
    if (!window.confirm("Delete product?")) return;
    await axios.delete(API + "/products/" + id);
    refresh();
  }

  return (
    <div className="products">
      <h2>Product Management</h2>
      <form className="product-form" onSubmit={handleAdd}>
        <input required placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <input placeholder="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
        <input type="number" step="0.01" placeholder="Price (LSL)" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
        <input type="number" placeholder="Initial Quantity" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
        <button type="submit">Add Product</button>
      </form>

      <div className="product-table">
        <table>
          <thead><tr><th>Name</th><th>Category</th><th>Price</th><th>Qty</th><th>Actions</th></tr></thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className={p.quantity <= 5 ? "low" : ""}>
                <td>{p.name}</td>
                <td>{p.category}</td>
                <td>LSL {p.price.toFixed(2)}</td>
                <td>{p.quantity}</td>
                <td><button onClick={() => handleDelete(p.id)}>Delete</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------------- Inventory ---------------- */
function Inventory({ products }) {
  return (
    <div className="inventory">
      <h2>Inventory</h2>
      <table className="inv-table">
        <thead>
          <tr><th>Image</th><th>Name</th><th>Qty</th><th>Price</th></tr>
        </thead>
        <tbody>
          {products.map((p) => (
            <tr key={p.id} className={p.quantity <= 5 ? "low" : ""}>
              <td><img src={p.image} alt="" style={{ width: 80 }} /></td>
              <td>{p.name}</td>
              <td>{p.quantity}</td>
              <td>LSL {p.price.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ---------------- Reports ---------------- */
function Reports() {
  const [data, setData] = useState({ report: [], totalRevenue: 0, topSelling: [] });
  const [error, setError] = useState(null); // Add state for error

  useEffect(() => {
    axios.get(API + "/reports/summary")
      .then((r) => {
        console.log('Reports response:', r.data); // Log success
        setData(r.data);
      })
      .catch((error) => {
        console.error('Error fetching reports:', error.response?.data || error.message);
        setError(error.response?.data?.error || error.message);
      });
  }, []);

  return (
    <div className="reports">
      <h2>Reports</h2>
      {error ? (
        <div className="error">Failed to load reports: {error}</div>
      ) : (
        <div className="report-summary">
          <h3>Total revenue: LSL {data.totalRevenue.toFixed(2)}</h3>
          <h4>Top selling</h4>
          <ol>
            {data.topSelling.map((t) => (
              <li key={t.productId}>
                {t.name} — {t.qty} sold — LSL {t.revenue.toFixed(2)}
              </li>
            ))}
          </ol>
          <h4>Revenue by item</h4>
          <table>
            <thead><tr><th>Name</th><th>Qty sold</th><th>Revenue (LSL)</th></tr></thead>
            <tbody>
              {data.report.map((r) => (
                <tr key={r.productId}>
                  <td>{r.name}</td>
                  <td>{r.qty}</td>
                  <td>LSL {r.revenue.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ---------------- App ---------------- */
export default function App() {
  const [view, setView] = useState("dashboard");
  const [products, setProducts] = useState([]);

  async function fetchProducts() {
    const res = await axios.get(API + "/products");
    setProducts(res.data);
  }

  useEffect(() => {
    fetchProducts();
  }, []);

  return (
    <div className="app">
      <TopNav setView={setView} />
      <main className="main">
        {view === "dashboard" && <Dashboard products={products} />}
        {view === "sales" && <Sales products={products} onRecordSale={fetchProducts} />}
        {view === "products" && <Products products={products} refresh={fetchProducts} />}
        {view === "inventory" && <Inventory products={products} />}
        {view === "reports" && <Reports />}
      </main>
      <Footer />
    </div>
  );
}
