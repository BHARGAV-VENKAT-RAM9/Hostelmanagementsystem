import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import LoginModal from './components/LoginModal';
import VisitorDashboard from './visitor/VisitorDashboard';
import StudentDashboard from './student/StudentDashboard';
// Removed AdminDashboard import since admin is now hosted separately on port 5174
import { AlertCircle, RefreshCw } from 'lucide-react';

function App() {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('luxehostel_user');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.role === 'admin') {
          localStorage.removeItem('luxehostel_user');
          return null;
        }
        return parsed;
      }
    } catch (e) {
      localStorage.removeItem('luxehostel_user');
    }
    return null;
  });

  const [state, setState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isLoginOpen, setIsLoginOpen] = useState(false);

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
    fetchState();
  }, []);

  const handleLoginSuccess = (userData) => {
    if (userData.role === 'admin') {
      alert('Administrator accounts must login via the Admin Portal at http://localhost:5174.');
      return;
    }
    setUser(userData);
    localStorage.setItem('luxehostel_user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('luxehostel_user');
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* Navigation */}
      <Navbar 
        user={user} 
        onLogout={handleLogout} 
        onOpenLogin={() => setIsLoginOpen(true)} 
      />

      {/* Main Body */}
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
              Loading floor plans and configurations...
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
          <>
            {user === null && (
              <VisitorDashboard 
                state={state} 
                onOpenLogin={() => setIsLoginOpen(true)} 
              />
            )}

            {user && user.role === 'student' && (
              <StudentDashboard 
                state={state} 
                user={user} 
                onRefresh={fetchState} 
              />
            )}

            {/* Admin view is now hosted separately on port 5174 */}
          </>
        )}
      </main>

      {/* Portal Login modal overlay */}
      {isLoginOpen && (
        <LoginModal 
          onClose={() => setIsLoginOpen(false)} 
          onLoginSuccess={handleLoginSuccess}
        />
      )}

      {/* Global CSS animation injections */}
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
