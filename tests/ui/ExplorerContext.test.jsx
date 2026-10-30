import { renderHook } from '@testing-library/react';
import { ExplorerProvider, useExplorer } from '../../src/context/ExplorerContext.jsx';
import { FileExplorer } from '../../src/sdk/FileExplorer.js';

describe('ExplorerContext', () => {
  it('useExplorer returns the injected explorer instance when the provider gets an "explorer" prop', () => {
    const customExplorer = new FileExplorer();
    const { result } = renderHook(() => useExplorer(), {
      wrapper: ({ children }) => (
        <ExplorerProvider explorer={customExplorer}>{children}</ExplorerProvider>
      ),
    });

    expect(result.current).toBe(customExplorer);
  });

  it('the provider creates one instance when no prop is given, and keeps the same instance across re-renders', () => {
    const { result, rerender } = renderHook(() => useExplorer(), {
      wrapper: ExplorerProvider,
    });

    const firstInstance = result.current;
    expect(firstInstance).toBeInstanceOf(FileExplorer);

    rerender();
    expect(result.current).toBe(firstInstance);
  });

  it('useExplorer used outside the provider throws a clear error', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      renderHook(() => useExplorer());
    }).toThrow('useExplorer must be used within an ExplorerProvider');

    consoleErrorSpy.mockRestore();
  });
});
