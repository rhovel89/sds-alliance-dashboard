import { Link } from 'react-router-dom';

export default function MyAlliance() {
  return (
    <div className='page' className='bg-sds'>
      <div className='page' style={{ padding: 40, color: '#eee' }}>
        <h2>My Alliance</h2>

        <Link to="/hq-map" style={{ color: '#ff4444' }}>
          View HQ Map
        </Link>
      </div>
    </div>
  );
}


