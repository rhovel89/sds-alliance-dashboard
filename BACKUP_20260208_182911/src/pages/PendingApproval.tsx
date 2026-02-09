export default function PendingApproval() {
  return (
    <div className="panel scanner">
      <h2>☣️ Quarantine Status</h2>
      <span className="quarantine-badge">AWAITING CLEARANCE</span>
      <p>Your request is under review by Overseers.</p>
      <div style={{ marginTop: '2rem' }}>
        <div className="zombie-spinner" />
      </div>
    </div>
  );
}
