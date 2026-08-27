import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signIn(email, password);
      navigate('/products');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-header">
        <span className="brand-badge">⚡ StockFlow Cloud</span>
        <h2>Welcome Back</h2>
        <p>Sign in to your account to manage inventory</p>
      </div>

      {error && <div className="alert-error">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">Work Email</label>
          <input
            type="email"
            placeholder="name@company.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className="form-input"
          />
        </div>

        <div className="form-group">
          <label className="form-label">Password</label>
          <input
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            className="form-input"
          />
        </div>

        <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: 10 }}>
          {loading ? 'Authenticating…' : 'Sign In'}
        </button>
      </form>

      <p style={{ marginTop: 24, textAlign: 'center' }}>
        Don't have an account? <Link to="/register">Create an account</Link>
      </p>
    </div>
  );
}
