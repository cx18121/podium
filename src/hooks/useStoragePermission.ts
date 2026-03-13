// src/hooks/useStoragePermission.ts
// Source: https://web.dev/articles/persistent-storage
export async function requestPersistentStorage(): Promise<boolean> {
  if (!navigator.storage?.persist) return false;
  const already = await navigator.storage.persisted();
  if (already) return true;
  // Chrome and Edge auto-approve or auto-deny based on site engagement.
  // Firefox shows a user permission popup.
  // Return value is informational — do not block the user on false.
  return navigator.storage.persist();
}
