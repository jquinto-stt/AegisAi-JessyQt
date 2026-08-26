import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'register' | 'confirm'>('register');
  const [error, setError] = useState('');
  const { signUp, confirmSignUp } = useAuth();
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await signUp(email, password);
      setStep('confirm');
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    }
  };

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await confirmSignUp(email, code);
      navigate('/login');
    } catch (err: any) {
      setError(err.message || 'Confirmation failed');
    }
  };

  if (step === 'confirm') {
    return (
      <div style={{ maxWidth: 400, margin: '100px auto', padding: 20 }}>
        <h1>Confirm Registration</h1>
        <p>Check your email for a verification code.</p>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <form onSubmit={handleConfirm}>
          <input
            type="text"
            placeholder="Verification code"
            value={code}
            onChange={e => setCode(e.target.value)}
            required
            style={{ display: 'block', width: '100%', marginBottom: 10, padding: 8 }}
          />
          <button type="submit" style={{ padding: '8px 16px' }}>Confirm</button>
        </form>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 400, margin: '100px auto', padding: 20 }}>
      <h1>Register — StockFlow</h1>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <form onSubmit={handleRegister}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          style={{ display: 'block', width: '100%', marginBottom: 10, padding: 8 }}
        />
        <input
          type="password"
          placeholder="Password (min 8 chars)"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          minLength={8}
          style={{ display: 'block', width: '100%', marginBottom: 10, padding: 8 }}
        />
        <button type="submit" style={{ padding: '8px 16px' }}>Register</button>
      </form>
      <p style={{ marginTop: 16 }}>
        Already have an account? <Link to="/login">Login</Link>
      </p>
    </div>
  );
}
