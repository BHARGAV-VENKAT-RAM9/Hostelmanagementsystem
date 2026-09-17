import React from 'react';
import { LogOut, ShieldAlert, User, Key, Eye } from 'lucide-react';

export default function Navbar({ user, onLogout, onOpenLogin }) {
  return (
    <nav className="glass-panel" style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'between',
      justifyContent: 'space-between',
      padding: '16px 24px',
      marginBottom: '32px',
      borderRadius: '0px 0px 16px 16px',
      borderTop: 'none',
      borderLeft: 'none',
      borderRight: 'none'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{
          width: '10px',
          height: '10px',
          borderRadius: '50%',
          backgroundColor: 'var(--color-accent)',
          boxShadow: '0 0 10px var(--color-accent)'
        }}></div>
        <span style={{
          fontFamily: 'var(--font-heading)',
          fontWeight: '700',
          fontSize: '1.25rem',
          letterSpacing: '-0.05em',
          color: 'var(--color-foreground)'
        }}>
          LuxeHostel<span style={{ color: 'var(--color-accent)' }}>.</span>
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {user ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div className="glass-panel" style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 12px',
              fontSize: '0.85rem',
              borderRadius: '8px',
              background: 'rgba(255,255,255,0.05)'
            }}>
              {user.role === 'admin' ? (
                <>
                  <ShieldAlert size={14} style={{ color: 'var(--color-accent)' }} />
                  <span style={{ color: 'var(--color-accent)', fontWeight: '600', fontFamily: 'var(--font-heading)' }}>
                    ADMIN PANEL
                  </span>
                </>
              ) : (
                <>
                  <User size={14} style={{ color: '#60a5fa' }} />
                  <span style={{ color: '#60a5fa', fontWeight: '600', fontFamily: 'var(--font-heading)' }}>
                    ROOM {user.room}
                  </span>
                </>
              )}
            </div>

            <button 
              onClick={onLogout} 
              className="btn btn-secondary"
              style={{ padding: '8px 16px', fontSize: '0.8rem' }}
            >
              <LogOut size={14} />
              Logout
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button 
              onClick={onOpenLogin} 
              className="btn btn-primary"
              style={{ padding: '8px 16px', fontSize: '0.8rem' }}
            >
              <Key size={14} />
              Portal Login
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
