import React from 'react';
import { LogOut, ShieldAlert } from 'lucide-react';

export default function Navbar({ onLogout }) {
  return (
    <nav className="glass-panel" style={{
      display: 'flex',
      alignItems: 'center',
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
        <div className="glass-panel" style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 12px',
          fontSize: '0.85rem',
          borderRadius: '8px',
          background: 'rgba(255,255,255,0.05)'
        }}>
          <ShieldAlert size={14} style={{ color: 'var(--color-accent)' }} />
          <span style={{ color: 'var(--color-accent)', fontWeight: '600', fontFamily: 'var(--font-heading)' }}>
            ADMIN PORTAL
          </span>
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
    </nav>
  );
}
