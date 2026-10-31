import { useState, useEffect } from 'react';

/**
 * Developer Mode utility
 * Activated via URL query parameter `dev=true` or `&dev=true` (or `dev=1`)
 * e.g. http://localhost:8080/?dev=true
 */

export function isDevMode(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const params = new URLSearchParams(window.location.search);
    const devParam = params.get('dev');
    if (devParam !== null) {
      const isEnabled = devParam === 'true' || devParam === '1' || devParam === '';
      sessionStorage.setItem('intergeo_dev_mode', isEnabled ? 'true' : 'false');
      return isEnabled;
    }
    return sessionStorage.getItem('intergeo_dev_mode') === 'true';
  } catch {
    return false;
  }
}

export function setDevMode(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem('intergeo_dev_mode', enabled ? 'true' : 'false');
    const url = new URL(window.location.href);
    if (enabled) {
      url.searchParams.set('dev', 'true');
    } else {
      url.searchParams.delete('dev');
    }
    window.history.replaceState({}, '', url.toString());
    window.dispatchEvent(new Event('devmodechange'));
  } catch {
    // Ignore
  }
}

export function useDevMode(): boolean {
  const [dev, setDev] = useState<boolean>(() => isDevMode());

  useEffect(() => {
    const handler = () => {
      setDev(isDevMode());
    };
    window.addEventListener('devmodechange', handler);
    window.addEventListener('popstate', handler);
    return () => {
      window.removeEventListener('devmodechange', handler);
      window.removeEventListener('popstate', handler);
    };
  }, []);

  return dev;
}
