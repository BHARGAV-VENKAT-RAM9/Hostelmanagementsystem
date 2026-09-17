import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import AdminDashboard from './admin/AdminDashboard';
import { AlertCircle, RefreshCw, Lock, User, Eye, EyeOff } from 'lucide-react';

function App() {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('luxehostel_admin');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      localStorage.removeItem('luxehostel_admin');
      return null;
    }
  });

  const [state, setState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [authenticating, setAuthenticating] = useState(false);

  const fetchState = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('http://localhost:5000/api/state');
      if (!response.ok) {
        throw new Error('Failed to load state');
      }
      const data = await response.json();
      setState(data);
    } catch (err) {
      setError(
        'Could not connect to the LuxeHostel server. Make sure the backend server is running on http://localhost:5000.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchState();
    } else {
      setLoading(false);
    }
  }, [user]);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setLoginError('Please fill in all fields');
      return;
    }

    setLoginError('');
    setAuthenticating(true);

    try {
      const response = await fetch('http://localhost:5000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      if (data.role !== 'admin') {
        throw new Error('Unauthorized. Only administrators can access this portal.');
      }

      setUser(data);
      localStorage.setItem('luxehostel_admin', JSON.stringify(data));
    } catch (err) {
      setLoginError(err.message);
    } finally {
      setAuthenticating(false);
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('luxehostel_admin');
  };

  if (!user) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}>
        <div className="glass-panel" style={{
          padding: '36px',
          width: '100%',
          maxWidth: '420px',
          boxShadow: 'var(--shadow-xl)'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <span style={{
              fontFamily: 'var(--font-heading)',
              fontWeight: '700',
              fontSize: '1.6rem',
              color: 'var(--color-foreground)'
            }}>
              LuxeHostel<span style={{ color: 'var(--color-accent)' }}>.</span>
            </span>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-muted-text)', marginTop: '6px' }}>
              Administrator Control Portal
            </p>
          </div>

          {loginError && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              color: 'var(--color-destructive)',
              padding: '10px 14px',
              borderRadius: '8px',
              fontSize: '0.85rem',
              marginBottom: '18px',
              fontFamily: 'var(--font-heading)'
            }}>
              {loginError}
            </div>
          )}

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{
                display: 'block',
                fontSize: '0.75rem',
                fontFamily: 'var(--font-heading)',
                color: 'var(--color-muted-text)',
                marginBottom: '6px',
                textTransform: 'uppercase'
              }}>
                ADMIN USERNAME
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--color-muted-text)'
                }}>
                  <User size={16} />
                </span>
                <input 
                  type="text" 
                  className="input" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin" 
                  style={{ paddingLeft: '40px' }}
                  disabled={authenticating}
                  autoComplete="username"
                />
              </div>
            </div>

            <div>
              <label style={{
                display: 'block',
                fontSize: '0.75rem',
                fontFamily: 'var(--font-heading)',
                color: 'var(--color-muted-text)',
                marginBottom: '6px',
                textTransform: 'uppercase'
              }}>
                PORTAL PASSWORD
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--color-muted-text)'
                }}>
                  <Lock size={16} />
                </span>
                <input 
                  type={showPassword ? "text" : "password"} 
                  className="input" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••" 
                  style={{ paddingLeft: '40px', paddingRight: '40px' }}
                  disabled={authenticating}
                  autoComplete="current-password"
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--color-muted-text)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '4px'
                  }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button 
              type="submit" 
              className="btn btn-primary"
              style={{ marginTop: '8px', padding: '12px' }}
              disabled={authenticating}
            >
              {authenticating ? 'Authenticating...' : 'Access Portal'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar onLogout={handleLogout} />

      <main style={{ flex: 1 }}>
        {loading && !state ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '100px 20px',
            gap: '16px'
          }}>
            <RefreshCw size={32} className="animate-spin" style={{ color: 'var(--color-accent)' }} />
            <p style={{ color: 'var(--color-muted-text)', fontSize: '0.95rem', fontFamily: 'var(--font-heading)' }}>
              Loading dashboard details...
            </p>
          </div>
        ) : error ? (
          <div style={{ maxWidth: '600px', margin: '60px auto', padding: '0 16px' }}>
            <div className="glass-panel" style={{
              padding: '32px',
              border: '2px solid rgba(239, 68, 68, 0.3)',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '16px'
            }}>
              <AlertCircle size={40} style={{ color: 'var(--color-destructive)' }} />
              <h3 style={{ fontSize: '1.25rem', color: 'white' }}>Connection Offline</h3>
              <p style={{ color: 'var(--color-muted-text)', fontSize: '0.9rem', lineHeight: '1.5' }}>
                {error}
              </p>
              <button 
                onClick={fetchState} 
                className="btn btn-primary"
                style={{ marginTop: '8px', display: 'inline-flex', gap: '8px' }}
              >
                <RefreshCw size={14} />
                Try Reconnecting
              </button>
            </div>
          </div>
        ) : (
          <AdminDashboard 
            state={state} 
            onRefresh={fetchState} 
          />
        )}
      </main>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin {
          animation: spin 1.5s linear infinite;
        }
        @media print {
          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}

export default App;
