import { useAuth } from '../auth/AuthContext';

export default function Home() {
  const { user, signOut } = useAuth();

  return (
    <div style={{ maxWidth: 600, margin: '100px auto', padding: 20 }}>
      <h1>StockFlow Dashboard</h1>
      <p>Welcome! You are authenticated as: <strong>{user?.getUsername()}</strong></p>
      <button onClick={signOut} style={{ padding: '8px 16px', marginTop: 16 }}>
        Sign Out
      </button>
    </div>
  );
}
