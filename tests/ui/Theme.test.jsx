import { render, screen, fireEvent, renderHook, act } from '@testing-library/react';
import { ThemeProvider, useTheme } from '../../src/context/ThemeContext.jsx';
import { ThemeToggle } from '../../src/components/ThemeToggle.jsx';

describe('Theme and ThemeToggle', () => {
  beforeEach(() => {
    document.documentElement.classList.remove('dark');
    localStorage.clear();
  });

  afterEach(() => {
    document.documentElement.classList.remove('dark');
    localStorage.clear();
  });

  it('ThemeProvider reads the initial theme from the "dark" class on document.documentElement', () => {
    document.documentElement.classList.add('dark');

    const { result } = renderHook(() => useTheme(), {
      wrapper: ThemeProvider,
    });

    expect(result.current.theme).toBe('dark');
  });

  it('toggleTheme switches the theme, adds or removes the "dark" class, and saves the value in localStorage under "theme"', () => {
    const { result } = renderHook(() => useTheme(), {
      wrapper: ThemeProvider,
    });

    expect(result.current.theme).toBe('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);

    act(() => {
      result.current.toggleTheme();
    });

    expect(result.current.theme).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(localStorage.getItem('theme')).toBe('dark');

    act(() => {
      result.current.toggleTheme();
    });

    expect(result.current.theme).toBe('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(localStorage.getItem('theme')).toBe('light');
  });

  it('ThemeToggle shows the correct aria-label for each theme and switches the theme when clicked', async () => {
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    );

    const button = screen.getByRole('button', { name: 'Switch to dark theme' });
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute('title', 'Switch to dark theme');

    await fireEvent.click(button);
    expect(button).toHaveAttribute('aria-label', 'Switch to light theme');
    expect(button).toHaveAttribute('title', 'Switch to light theme');
    expect(document.documentElement.classList.contains('dark')).toBe(true);

    await fireEvent.click(button);
    expect(button).toHaveAttribute('aria-label', 'Switch to dark theme');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('does not crash when window.matchMedia is missing, and does not crash when localStorage throws', () => {
    const originalMatchMedia = window.matchMedia;
    delete window.matchMedia;

    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Quota exceeded');
    });
    const getItemSpy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('Access denied');
    });

    expect(() => {
      const { result } = renderHook(() => useTheme(), {
        wrapper: ThemeProvider,
      });

      act(() => {
        result.current.toggleTheme();
      });
    }).not.toThrow();

    setItemSpy.mockRestore();
    getItemSpy.mockRestore();
    window.matchMedia = originalMatchMedia;
  });

  it('useTheme outside ThemeProvider throws a clear error', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      renderHook(() => useTheme());
    }).toThrow('useTheme must be used within a ThemeProvider');

    spy.mockRestore();
  });
});
