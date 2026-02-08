import React from 'react';
import { PlannerMonth } from '../components/events_v2/PlannerMonth';
import '../styles/events_v2.css';

export default function EventsPage() {
  return (
    <div style={{ width: '100%' }}>
      <PlannerMonth />
    </div>
  );
}
