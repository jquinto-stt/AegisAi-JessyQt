import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../auth/AuthContext';
import { listProducts, createProduct, USE_MOCK, type Product } from '../api/products';

export default function Products() {
  const { getIdToken, user, signOut } = useAuth();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const token = await getIdToken();
      const items = await listProducts(token);
      setProducts(items);
    } catch (err: any) {
      setError(err.message || 'Failed to load products');
    } finally {
      setLoading(false);
    }
  }, [getIdToken]);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const token = await getIdToken();
      const product = await createProduct(
        {
          name: name.trim(),
          sku: sku.trim(),
          price: Number(price),
          stock: Number(stock),
        },
        token,
      );
      setProducts(prev => [product, ...prev]);
      setName('');
      setSku('');
      setPrice('');
      setStock('');
    } catch (err: any) {
      const details = err.details ? ` (${JSON.stringify(err.details)})` : '';
      setError((err.message || 'Failed to create product') + details);
    } finally {
      setSubmitting(false);
    }
  };

  const totalStock = products.reduce((acc, curr) => acc + (curr.stock || 0), 0);
  const totalValue = products.reduce((acc, curr) => acc + (curr.stock * curr.price || 0), 0);
  const lowStockCount = products.filter(p => p.stock < 5).length;

  return (
    <div className="dashboard-container">
      {/* Top Navbar */}
      <div className="dashboard-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="brand-badge" style={{ marginBottom: 0 }}>⚡ StockFlow</span>
            <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
              User: <strong style={{ color: '#fff' }}>{user?.getUsername()}</strong>
            </span>
          </div>
          <h2 style={{ marginTop: 8 }}>Inventory Management</h2>
        </div>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <button onClick={signOut} className="btn-secondary">
            Sign Out
          </button>
        </div>
      </div>

      {USE_MOCK && (
        <div className="alert-mock">
          <span>⚡</span>
          <div>
            <strong>Interactive Mode</strong> — Inventory items are stored and persisted per-user in your session.
          </div>
        </div>
      )}

      {/* Metric Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-title">Total Products</div>
          <div className="stat-value">{products.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-title">Units in Stock</div>
          <div className="stat-value">{totalStock}</div>
        </div>
        <div className="stat-card">
          <div className="stat-title">Inventory Value</div>
          <div className="stat-value">${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
        </div>
        <div className="stat-card">
          <div className="stat-title">Low Stock Alerts</div>
          <div className="stat-value" style={{ color: lowStockCount > 0 ? '#f87171' : '#34d399' }}>
            {lowStockCount}
          </div>
        </div>
      </div>

      {error && <div className="alert-error">{error}</div>}

      {/* Creation Form Card */}
      <div className="table-card" style={{ marginBottom: 28 }}>
        <div className="table-header-box">
          <h3>Add New Product</h3>
          <p>Register items into catalog</p>
        </div>

        <form onSubmit={handleCreate} style={{ padding: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto', gap: 12, alignItems: 'end' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Product Name</label>
              <input
                placeholder="e.g. Mechanical Keyboard"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                className="form-input"
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">SKU</label>
              <input
                placeholder="KB-01"
                value={sku}
                onChange={e => setSku(e.target.value)}
                required
                className="form-input"
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Price ($)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="29.99"
                value={price}
                onChange={e => setPrice(e.target.value)}
                required
                className="form-input"
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Qty</label>
              <input
                type="number"
                min="0"
                step="1"
                placeholder="10"
                value={stock}
                onChange={e => setStock(e.target.value)}
                required
                className="form-input"
              />
            </div>

            <button type="submit" disabled={submitting} className="btn-primary" style={{ height: 44, width: 'auto', padding: '0 24px' }}>
              {submitting ? 'Adding…' : '+ Add Item'}
            </button>
          </div>
        </form>
      </div>

      {/* Product List Table */}
      <div className="table-card">
        <div className="table-header-box">
          <div>
            <h3>Active Catalog</h3>
            <p>{products.length} registered item(s)</p>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>
            Loading inventory items…
          </div>
        ) : products.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>
            No products found in inventory. Add your first item above!
          </div>
        ) : (
          <table className="custom-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>SKU</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {products.map(p => {
                let badgeClass = 'badge-success';
                let statusText = 'In Stock';
                if (p.stock === 0) {
                  badgeClass = 'badge-danger';
                  statusText = 'Out of Stock';
                } else if (p.stock < 5) {
                  badgeClass = 'badge-warning';
                  statusText = 'Low Stock';
                }

                return (
                  <tr key={p.id}>
                    <td>
                      <strong style={{ color: '#fff' }}>{p.name}</strong>
                    </td>
                    <td>
                      <code style={{ background: 'rgba(255,255,255,0.06)', padding: '2px 6px', borderRadius: 4, color: '#818cf8' }}>
                        {p.sku}
                      </code>
                    </td>
                    <td>${Number(p.price).toFixed(2)}</td>
                    <td>{p.stock} units</td>
                    <td>
                      <span className={`badge ${badgeClass}`}>{statusText}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
