import { useEffect, useState } from 'react';
import { isAppOwner } from '../lib/isAppOwner';

export default function OwnerOnly({ children }: { children: React.ReactNode }) {
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    isAppOwner().then(setAllowed);
  }, []);

  if (!allowed) return null;
  return <>{children}</>;
}