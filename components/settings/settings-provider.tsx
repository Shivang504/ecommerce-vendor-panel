'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { defaultSiteSettings, type SiteSettings } from '@/lib/site-settings';

type SettingsContextValue = {
  settings: SiteSettings;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  updateLocal: (partial: Partial<SiteSettings>) => void;
};

const SettingsContext = createContext<SettingsContextValue | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  // Always start with default settings to avoid hydration mismatch
  // Server and client must render the same initially
  const [settings, setSettings] = useState<SiteSettings>(defaultSiteSettings);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  const applyBrandTokens = useCallback((data: SiteSettings) => {
    if (typeof document === 'undefined') return;

    const root = document.documentElement;
    root.style.setProperty('--brand-primary', data.primaryColor || defaultSiteSettings.primaryColor);
    root.style.setProperty('--brand-accent', data.accentColor || defaultSiteSettings.accentColor);

    if (data.siteTitle) {
      document.title = data.siteTitle;
    }

    // Only manage the favicon node we own to avoid removing elements that React controls,
    // otherwise client-side navigations can crash when React tries to clean them up.
    try {
      const head = document.head;
      if (!head) return;

      const selector = "link[rel='icon'][data-site-settings-favicon='true']";
      let managedFavicon = head.querySelector<HTMLLinkElement>(selector);
      const favicon = data.favicon?.trim();

      if (favicon) {
        if (!managedFavicon) {
          managedFavicon = document.createElement('link');
          managedFavicon.rel = 'icon';
          managedFavicon.type = 'image/png';
          managedFavicon.setAttribute('data-site-settings-favicon', 'true');
          head.appendChild(managedFavicon);
        }
        managedFavicon.href = favicon;
      } else if (managedFavicon?.parentNode) {
        managedFavicon.parentNode.removeChild(managedFavicon);
      }
    } catch (err) {
      console.warn('Failed to update favicon:', err);
    }
  }, []);

  // Only access localStorage after mount to avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
    
    // Try to load from localStorage after mount
    try {
      const cached = localStorage.getItem('siteSettings');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && typeof parsed === 'object') {
          const normalized = { ...defaultSiteSettings, ...parsed };
          setSettings(normalized);
          applyBrandTokens(normalized);
        }
      }
    } catch (err) {
      console.error('[settings] Failed to load cached settings:', err);
    }
  }, [applyBrandTokens]);

  // Apply brand tokens only after mount to avoid hydration issues
  useEffect(() => {
    if (mounted) {
      applyBrandTokens(settings);
    }
  }, [mounted, settings, applyBrandTokens]);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/settings', { cache: 'no-store' });
      if (!response.ok) {
        throw new Error('Failed to load settings');
      }
      const payload = await response.json();
      const normalized: SiteSettings = { ...defaultSiteSettings, ...payload };
      
      // Only update if settings actually changed to prevent unnecessary re-renders
      setSettings(prev => {
        const hasChanged = JSON.stringify(prev) !== JSON.stringify(normalized);
        return hasChanged ? normalized : prev;
      });
      
      applyBrandTokens(normalized);
      
      // Cache settings in localStorage for faster initial load
      if (mounted && typeof window !== 'undefined') {
        try {
          localStorage.setItem('siteSettings', JSON.stringify(normalized));
        } catch (err) {
          console.error('[settings] Failed to cache settings:', err);
        }
      }
      
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load settings';
      setError(message);
      console.error('[settings] refresh failed:', err);
    } finally {
      setLoading(false);
    }
  }, [applyBrandTokens, mounted]);

  useEffect(() => {
    // Only refresh once on mount, not on every refresh function change
    if (mounted) {
      refresh();
    }
  }, [mounted]); // Only depend on mounted, not refresh

  const updateLocal = useCallback(
    (partial: Partial<SiteSettings>) => {
      setSettings(prev => {
        const next = { ...prev, ...partial };
        applyBrandTokens(next);
        
        // Update cache immediately (only after mount)
        if (mounted && typeof window !== 'undefined') {
          try {
            localStorage.setItem('siteSettings', JSON.stringify(next));
          } catch (err) {
            console.error('[settings] Failed to cache settings:', err);
          }
        }
        
        return next;
      });
    },
    [applyBrandTokens, mounted],
  );

  const value = useMemo<SettingsContextValue>(
    () => ({
      settings,
      loading,
      error,
      refresh,
      updateLocal,
    }),
    [settings, loading, error, refresh, updateLocal],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within SettingsProvider');
  }
  return context;
}

