import React, { useState } from 'react';
import { X, Lock, User, Eye, EyeOff } from 'lucide-react';

export default function LoginModal({ onClose, onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Please fill in all fields');
      return;
    }

    if (username.trim().toLowerCase() === 'admin') {
      setError('Admin logins are not allowed on this portal. Please use the Admin Control Portal on port 5174.');
      return;
    }

    setError('');
    setLoading(true);

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

      onLoginSuccess(data);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal" 
        onClick={(e) => e.stopPropagation()}
        style={{ padding: '28px' }}
      >
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px'
        }}>
          <div>
            <h3 style={{ fontSize: '1.25rem', color: 'var(--color-foreground)' }}>Portal Login</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-muted-text)', marginTop: '4px' }}>
              Sign in with your room credentials
            </p>
          </div>
          <button 
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--color-muted-text)',
              cursor: 'pointer',
              padding: '4px'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {error && (
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
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{
              display: 'block',
              fontSize: '0.75rem',
              fontFamily: 'var(--font-heading)',
              color: 'var(--color-muted-text)',
              marginBottom: '6px',
              textTransform: 'uppercase'
            }}>
              Room ID (e.g. 102)
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
                placeholder="room ID (e.g., 102)" 
                style={{ paddingLeft: '40px' }}
                disabled={loading}
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
              Password
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
                disabled={loading}
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
            disabled={loading}
          >
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        <div style={{
          marginTop: '20px',
          borderTop: '1px solid var(--color-border)',
          paddingTop: '16px',
          fontSize: '0.75rem',
          color: 'var(--color-muted-text)',
          textAlign: 'center'
        }}>
          💡 Student Resident: <code style={{ color: 'var(--color-accent)' }}>102 / room102pass</code>
        </div>
      </div>
    </div>
  );
}
