
import React, { createContext, useContext, useState, useEffect } from 'react';

export type ThemeOption = {
  id: string;
  name: string;
  primary: string;
  secondary: string;
};

export const themes: ThemeOption[] = [
  { id: 'monochrome', name: 'Monochrome (Cal.com)', primary: '#111827', secondary: '#000000' }, // Zinc 900
  { id: 'slate', name: 'Slate Professional', primary: '#334155', secondary: '#0f172a' },
  { id: 'indigo', name: 'Modern Indigo', primary: '#4f46e5', secondary: '#312e81' },
];

interface ThemeContextType {
  currentTheme: ThemeOption;
  setTheme: (themeId: string) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  currentTheme: themes[0],
  setTheme: () => {},
});

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentTheme, setCurrentTheme] = useState<ThemeOption>(themes[0]);

  useEffect(() => {
    // Load from local storage on mount
    const savedThemeId = localStorage.getItem('otrack_theme');
    if (savedThemeId) {
      const found = themes.find(t => t.id === savedThemeId);
      if (found) setCurrentTheme(found);
    }
  }, []);

  useEffect(() => {
    // Apply CSS variables to root
    const root = document.documentElement;
    root.style.setProperty('--color-primary', currentTheme.primary);
    root.style.setProperty('--color-secondary', currentTheme.secondary);
  }, [currentTheme]);

  const setTheme = (themeId: string) => {
    const found = themes.find(t => t.id === themeId);
    if (found) {
      setCurrentTheme(found);
      localStorage.setItem('otrack_theme', themeId);
    }
  };

  return (
    <ThemeContext.Provider value={{ currentTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
