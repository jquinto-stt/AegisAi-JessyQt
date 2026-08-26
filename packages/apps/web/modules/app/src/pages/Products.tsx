import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { listProducts, createProduct, type Product } from '../api/products';

export default function Products() {
  const { getIdToken } = useAuth();

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
      // Optimistic UI update: prepend the new product to the list.
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

  return (
    <div style={{ maxWidth: 720, margin: '60px auto', padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Products — StockFlow</h1>
        <Link to="/">← Dashboard</Link>
      </div>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      <form
        onSubmit={handleCreate}
        style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1fr 1fr 1fr auto',
          gap: 8,
          alignItems: 'end',
          margin: '20px 0',
        }}
      >
        <label>
          Name
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            required
            style={{ display: 'block', width: '100%', padding: 8 }}
          />
        </label>
        <label>
          SKU
          <input
            value={sku}
            onChange={e => setSku(e.target.value)}
            required
            style={{ display: 'block', width: '100%', padding: 8 }}
          />
        </label>
        <label>
          Price
          <input
            type="number"
            min="0"
            step="0.01"
            value={price}
            onChange={e => setPrice(e.target.value)}
            required
            style={{ display: 'block', width: '100%', padding: 8 }}
          />
        </label>
        <label>
          Stock
          <input
            type="number"
            min="0"
            step="1"
            value={stock}
            onChange={e => setStock(e.target.value)}
            required
            style={{ display: 'block', width: '100%', padding: 8 }}
          />
        </label>
        <button type="submit" disabled={submitting} style={{ padding: '8px 16px' }}>
          {submitting ? 'Adding…' : 'Add'}
        </button>
      </form>

      {loading ? (
        <p>Loading products…</p>
      ) : products.length === 0 ? (
        <p>No products yet. Create your first one above.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '2px solid #ddd' }}>
              <th style={{ padding: 8 }}>Name</th>
              <th style={{ padding: 8 }}>SKU</th>
              <th style={{ padding: 8 }}>Price</th>
              <th style={{ padding: 8 }}>Stock</th>
            </tr>
          </thead>
          <tbody>
            {products.map(p => (
              <tr key={p.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: 8 }}>{p.name}</td>
                <td style={{ padding: 8 }}>{p.sku}</td>
                <td style={{ padding: 8 }}>{p.price.toFixed(2)}</td>
                <td style={{ padding: 8 }}>{p.stock}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
