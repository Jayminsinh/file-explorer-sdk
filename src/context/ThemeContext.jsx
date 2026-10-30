import { createContext, useContext, useState, useMemo, useCallback } from 'react';

const ThemeContext = createContext(null);

function getInitialTheme() {
  if (typeof document !== 'undefined' && document.documentElement) {
    if (document.documentElement.classList.contains('dark')) {
      return 'dark';
    }
  }
  try {
    const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('theme') : null;
    if (saved === 'dark' || saved === 'light') {
      return saved;
    }
    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      const mql = window.matchMedia('(prefers-color-scheme: dark)');
      if (mql && mql.matches) {
        return 'dark';
      }
    }
  } catch (e) {}
  return 'light';
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(getInitialTheme);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      if (typeof document !== 'undefined' && document.documentElement) {
        if (next === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('theme', next);
        }
      } catch (e) {}
      return next;
    });
  }, []);

  const value = useMemo(() => ({ theme, toggleTheme }), [theme, toggleTheme]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
