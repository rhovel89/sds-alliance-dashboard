import { useSyncExternalStore } from "react";

type AnyEvent = Event & { detail?: any };

function subscribeKey(key: string, callback: () => void) {
  const onStorage = (e: StorageEvent) => {
    if (!e.key || e.key === key) callback();
  };

  const onCustom = (e: AnyEvent) => {
    const k = e?.detail?.key;
    if (!k || k === key) callback();
  };

  window.addEventListener("storage", onStorage);
  window.addEventListener("sad:localstorage", onCustom as any);

  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener("sad:localstorage", onCustom as any);
  };
}

function getSnapshotKey(key: string) {
  return localStorage.getItem(key) ?? "";
}

export function useSadLocalStorageText(key: string) {
  return useSyncExternalStore(
    (cb) => subscribeKey(key, cb),
    () => getSnapshotKey(key),
    () => getSnapshotKey(key)
  );
}
