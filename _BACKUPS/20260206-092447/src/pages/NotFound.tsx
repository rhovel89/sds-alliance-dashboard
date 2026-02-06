import { useEffect } from 'react';
import { setPageTitle } from '../utils/pageTitle';

export default function NotFound() {
  useEffect(() => {
    setPageTitle('Page Not Found');
  }, []);

  return (
    <div style={{ textAlign: 'center', paddingTop: '80px' }}>
      <h1 style={{ fontSize: '48px', marginBottom: '12px' }}>404</h1>
      <p style={{ opacity: 0.7, marginBottom: '24px' }}>
        The page you are looking for does not exist.
      </p>
      <a
        href="/"
        style={{
          color: '#6b5cff',
          textDecoration: 'none',
          fontWeight: 600
        }}
      >
        Return to Home
      </a>
    </div>
  );
}
