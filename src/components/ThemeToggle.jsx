import { memo } from 'react';
import { FiSun, FiMoon } from 'react-icons/fi';
import { useTheme } from '../context/ThemeContext.jsx';

export const ThemeToggle = memo(function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';
  const label = isDark ? 'Switch to light theme' : 'Switch to dark theme';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={label}
      title={label}
      className="flex items-center justify-center w-7 h-7 rounded text-ink-muted hover:text-ink hover:bg-surface-hover transition-colors"
    >
      {isDark ? <FiSun className="w-4 h-4" /> : <FiMoon className="w-4 h-4" />}
    </button>
  );
});
