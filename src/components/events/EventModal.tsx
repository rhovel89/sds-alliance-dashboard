export default function EventModal({ open, date, onClose, onSave }: any) {
  if (!open) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.75)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <div
        style={{
          background: '#111',
          color: '#fff',
          padding: '24px',
          width: '420px',
          borderRadius: '8px',
          boxShadow: '0 0 30px rgba(0,0,0,0.8)'
        }}
      >
        <h2>Create Event</h2>
        <p><strong>Date:</strong> {date}</p>

        <input
          type='text'
          placeholder='Event name'
          style={{
            width: '100%',
            padding: '10px',
            marginBottom: '12px'
          }}
        />

        <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
          <button onClick={onClose}>Cancel</button>
          <button
            onClick={() => onSave({ date })}
            style={{ background: '#4caf50', color: '#000' }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
