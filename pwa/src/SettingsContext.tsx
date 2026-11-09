import { createContext, useContext, type ReactNode } from 'react';
import { DEFAULT_SETTINGS, type AppSettings } from './settings';

interface SettingsContextValue {
  settings: AppSettings;
  updateSettings: (patch: Partial<AppSettings>) => void;
}

const SettingsContext = createContext<SettingsContextValue>({
  settings: DEFAULT_SETTINGS,
  updateSettings: () => {},
});

export function SettingsProvider({
  settings,
  updateSettings,
  children,
}: SettingsContextValue & { children: ReactNode }) {
  return (
    <SettingsContext.Provider value={{ settings, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

/** The current preferences. Components outside a provider get the defaults. */
export function useSettings(): AppSettings {
  return useContext(SettingsContext).settings;
}

/** Preferences plus the setter, for the settings panel. */
export function useSettingsActions(): SettingsContextValue {
  return useContext(SettingsContext);
}
