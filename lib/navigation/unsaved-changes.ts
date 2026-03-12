export type UnsavedChangesNavigationGuard = (nextUrl?: string) => boolean;

declare global {
  interface Window {
    __bidblenderUnsavedChangesGuard?: UnsavedChangesNavigationGuard;
  }
}

export function blockNavigationForUnsavedChanges(nextUrl?: string) {
  if (typeof window === "undefined") {
    return false;
  }

  return window.__bidblenderUnsavedChangesGuard?.(nextUrl) ?? false;
}
