import { useState } from 'react';
import { updateGameName } from '../hooks/useProfileEdit';

export default function EditableGameName({ userId, name, canEdit }) {
  const [value, setValue] = useState(name);

  if (!canEdit) return <span>{name}</span>;

  return (
    <input
      value={value}
      onChange={e => setValue(e.target.value)}
      onBlur={() => updateGameName(userId, value)}
      style={{ background: '#111', color: '#caff9a' }}
    />
  );
}
