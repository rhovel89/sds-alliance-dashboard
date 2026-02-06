import { useEffect, useState } from 'react';
import '../styles/dashboard-crt.css';

export default function CRTOverlay() {
  const [enabled, setEnabled] = useState(
    () => localStorage.getItem('crtEnabled') === 'true'
  );

  useEffect(() => {
    localStorage.setItem('crtEnabled', String(enabled));
  }, [enabled]);

  return (
    <>
      {enabled && <div className='crt-overlay' />}

      <button
        onClick={() => setEnabled(v => !v)}
        style={{
          position: 'fixed',
          bottom: '12px',
          right: '12px',
          zIndex: 10000,
          background: '#001b0a',
          color: '#6aff6a',
          border: '1px solid #3aff3a',
          fontFamily: 'monospace',
          padding: '6px 10px',
          cursor: 'pointer',
          boxShadow: '0 0 8px rgba(0,255,0,0.4)'
        }}
      >
        CRT {enabled ? 'ON' : 'OFF'}
      </button>
    </>
  );
}
