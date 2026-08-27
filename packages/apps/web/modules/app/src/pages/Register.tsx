import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'register' | 'confirm'>('register');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signUp, confirmSignUp } = useAuth();
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signUp(email, password);
      setStep('confirm');
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await confirmSignUp(email, code);
      navigate('/login');
    } catch (err: any) {
      setError(err.message || 'Confirmation failed');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'confirm') {
    return (
      <div className="auth-container">
        <div className="auth-header">
          <span className="brand-badge">⚡ Email Verification</span>
          <h2>Enter Verification Code</h2>
          <p>We've sent a 6-digit code to <strong>{email}</strong></p>
        </div>

        {error && <div className="alert-error">{error}</div>}

        <form onSubmit={handleConfirm}>
          <div className="form-group">
            <label className="form-label">Confirmation Code</label>
            <input
              type="text"
              placeholder="e.g. 123456"
              value={code}
              onChange={e => setCode(e.target.value)}
              required
              className="form-input"
              style={{ letterSpacing: '4px', textAlign: 'center', fontSize: '1.2rem' }}
            />
          </div>

          <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: 10 }}>
            {loading ? 'Verifying…' : 'Confirm Account'}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <div className="auth-header">
        <span className="brand-badge">⚡ StockFlow Cloud</span>
        <h2>Create Account</h2>
        <p>Get started with automated inventory tracking</p>
      </div>

      {error && <div className="alert-error">{error}</div>}

      <form onSubmit={handleRegister}>
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
            placeholder="Min 8 characters"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            minLength={8}
            className="form-input"
          />
        </div>

        <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: 10 }}>
          {loading ? 'Creating Account…' : 'Sign Up'}
        </button>
      </form>

      <p style={{ marginTop: 24, textAlign: 'center' }}>
        Already have an account? <Link to="/login">Sign In</Link>
      </p>
    </div>
  );
}
