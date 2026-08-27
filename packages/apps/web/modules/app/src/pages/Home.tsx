import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export default function Home() {
  const { user, signOut } = useAuth();

  return (
    <div className="auth-container" style={{ maxWidth: 540 }}>
      <div className="auth-header">
        <span className="brand-badge">⚡ StockFlow Cloud</span>
        <h2>Welcome Back</h2>
        <p>Authenticated as: <strong style={{ color: '#fff' }}>{user?.getUsername()}</strong></p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Link to="/products" className="btn-primary" style={{ textDecoration: 'none' }}>
          Open Inventory Dashboard →
        </Link>
        <button onClick={signOut} className="btn-secondary">
          Sign Out
        </button>
      </div>
    </div>
  );
}
