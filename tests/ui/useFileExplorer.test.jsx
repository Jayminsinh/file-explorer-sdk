import { render, renderHook, act } from '@testing-library/react';
import { ExplorerProvider } from '../../src/context/ExplorerContext.jsx';
import { useFileExplorerTree, useUndoRedoState } from '../../src/hooks/useFileExplorer.js';
import { FileExplorer } from '../../src/sdk/FileExplorer.js';

describe('useFileExplorer hooks', () => {
  it('useFileExplorerTree returns the seeded tree on first render', () => {
    const explorer = new FileExplorer();
    const { result } = renderHook(() => useFileExplorerTree(), {
      wrapper: ({ children }) => <ExplorerProvider explorer={explorer}>{children}</ExplorerProvider>,
    });

    expect(result.current).toEqual(explorer.getSnapshot());
    expect(result.current.name).toBe('My Files');
    expect(result.current.children).toHaveLength(3);
  });

  it('after an SDK mutation made outside React (wrapped in act), the hook returns the updated tree', () => {
    const explorer = new FileExplorer();
    const { result } = renderHook(() => useFileExplorerTree(), {
      wrapper: ({ children }) => <ExplorerProvider explorer={explorer}>{children}</ExplorerProvider>,
    });

    const root = explorer.getTree();
    act(() => {
      explorer.createFile(root.id, 'NewDocument.txt');
    });

    expect(result.current.children.some((c) => c.name === 'NewDocument.txt')).toBe(true);
    expect(result.current).toBe(explorer.getSnapshot());
  });

  it('the hook returns the same reference between renders when nothing changed', () => {
    const explorer = new FileExplorer();
    const { result, rerender } = renderHook(() => useFileExplorerTree(), {
      wrapper: ({ children }) => <ExplorerProvider explorer={explorer}>{children}</ExplorerProvider>,
    });

    const firstSnapshot = result.current;
    rerender();
    expect(result.current).toBe(firstSnapshot);
  });

  it('the component using the hook renders exactly once per SDK change', () => {
    const explorer = new FileExplorer();
    let renderCount = 0;

    function TestComponent() {
      renderCount++;
      const tree = useFileExplorerTree();
      return <div>{tree.name}</div>;
    }

    render(
      <ExplorerProvider explorer={explorer}>
        <TestComponent />
      </ExplorerProvider>
    );

    expect(renderCount).toBe(1);

    const root = explorer.getTree();
    act(() => {
      explorer.createFile(root.id, 'RenderTest.txt');
    });
    expect(renderCount).toBe(2);

    act(() => {
      explorer.createFolder(root.id, 'Folder1');
    });
    expect(renderCount).toBe(3);
  });

  it('a failed SDK operation (for example a duplicate name) does not cause any re-render', () => {
    const explorer = new FileExplorer();
    let renderCount = 0;

    function TestComponent() {
      renderCount++;
      useFileExplorerTree();
      return null;
    }

    render(
      <ExplorerProvider explorer={explorer}>
        <TestComponent />
      </ExplorerProvider>
    );

    expect(renderCount).toBe(1);

    const root = explorer.getTree();
    expect(() => {
      act(() => {
        explorer.createFolder(root.id, 'Documents');
      });
    }).toThrow();

    expect(renderCount).toBe(1);
  });

  it('the hook subscribes exactly once on mount (spy on explorer.subscribe), not again on re-render', () => {
    const explorer = new FileExplorer();
    const subscribeSpy = vi.spyOn(explorer, 'subscribe');

    const { rerender } = renderHook(() => useFileExplorerTree(), {
      wrapper: ({ children }) => <ExplorerProvider explorer={explorer}>{children}</ExplorerProvider>,
    });

    expect(subscribeSpy).toHaveBeenCalledTimes(1);

    rerender();
    expect(subscribeSpy).toHaveBeenCalledTimes(1);
  });

  it('when the component unmounts, the unsubscribe function returned by subscribe is called, and changes made after unmount do not cause errors or updates', () => {
    const explorer = new FileExplorer();
    const realSubscribe = explorer.subscribe.bind(explorer);
    let unsubscribeFn;

    vi.spyOn(explorer, 'subscribe').mockImplementation((listener) => {
      const unsub = realSubscribe(listener);
      unsubscribeFn = vi.fn(unsub);
      return unsubscribeFn;
    });

    const { unmount } = renderHook(() => useFileExplorerTree(), {
      wrapper: ({ children }) => <ExplorerProvider explorer={explorer}>{children}</ExplorerProvider>,
    });

    expect(unsubscribeFn).toBeDefined();
    expect(unsubscribeFn).not.toHaveBeenCalled();

    unmount();
    expect(unsubscribeFn).toHaveBeenCalledTimes(1);

    const root = explorer.getTree();
    expect(() => {
      act(() => {
        explorer.createFile(root.id, 'AfterUnmount.txt');
      });
    }).not.toThrow();
  });

  it('useUndoRedoState returns canUndo false and canRedo false at the start, then canUndo true after a mutation, then canRedo true after an undo, all updating the UI', () => {
    const explorer = new FileExplorer();

    function UndoRedoDisplay() {
      const { canUndo, canRedo } = useUndoRedoState();
      return (
        <div>
          <span data-testid="can-undo">{canUndo ? 'yes' : 'no'}</span>
          <span data-testid="can-redo">{canRedo ? 'yes' : 'no'}</span>
        </div>
      );
    }

    const { getByTestId } = render(
      <ExplorerProvider explorer={explorer}>
        <UndoRedoDisplay />
      </ExplorerProvider>
    );

    expect(getByTestId('can-undo')).toHaveTextContent('no');
    expect(getByTestId('can-redo')).toHaveTextContent('no');

    const root = explorer.getTree();
    act(() => {
      explorer.createFile(root.id, 'UndoTest.txt');
    });
    expect(getByTestId('can-undo')).toHaveTextContent('yes');
    expect(getByTestId('can-redo')).toHaveTextContent('no');

    act(() => {
      explorer.undo();
    });
    expect(getByTestId('can-undo')).toHaveTextContent('no');
    expect(getByTestId('can-redo')).toHaveTextContent('yes');

    act(() => {
      explorer.redo();
    });
    expect(getByTestId('can-undo')).toHaveTextContent('yes');
    expect(getByTestId('can-redo')).toHaveTextContent('no');
  });

  it('useUndoRedoState does not re-render when an SDK change leaves canUndo and canRedo the same', () => {
    const explorer = new FileExplorer();
    let renderCount = 0;

    function UndoRedoOnly() {
      renderCount++;
      const { canUndo, canRedo } = useUndoRedoState();
      return <div>{String(canUndo)}-{String(canRedo)}</div>;
    }

    render(
      <ExplorerProvider explorer={explorer}>
        <UndoRedoOnly />
      </ExplorerProvider>
    );

    expect(renderCount).toBe(1);

    const root = explorer.getTree();
    // First mutation changes canUndo from false to true
    act(() => {
      explorer.createFile(root.id, 'First.txt');
    });
    expect(renderCount).toBe(2);

    // Second mutation leaves canUndo true and canRedo false
    act(() => {
      explorer.createFile(root.id, 'Second.txt');
    });
    expect(renderCount).toBe(2);
  });
});
