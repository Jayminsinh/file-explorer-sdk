import { render, renderHook, act } from '@testing-library/react';
import { ExplorerProvider } from '../../src/context/ExplorerContext.jsx';
import {
  UiStateProvider,
  useIsExpanded,
  useIsSelected,
  useSelectedId,
  useUiActions,
} from '../../src/context/UiStateContext.jsx';
import { FileExplorer } from '../../src/sdk/FileExplorer.js';

function createWrapper(explorer = new FileExplorer()) {
  return function Wrapper({ children }) {
    return (
      <ExplorerProvider explorer={explorer}>
        <UiStateProvider>{children}</UiStateProvider>
      </ExplorerProvider>
    );
  };
}

describe('UiStateContext', () => {
  it('the root folder is expanded and nothing is selected at the start', () => {
    const explorer = new FileExplorer();
    const root = explorer.getTree();

    const { result } = renderHook(
      () => ({
        isRootExpanded: useIsExpanded(root.id),
        selectedId: useSelectedId(),
        isRootSelected: useIsSelected(root.id),
      }),
      { wrapper: createWrapper(explorer) }
    );

    expect(result.current.isRootExpanded).toBe(true);
    expect(result.current.selectedId).toBeNull();
    expect(result.current.isRootSelected).toBe(false);
  });

  it('toggleExpanded expands a collapsed folder and collapses an expanded one', () => {
    const explorer = new FileExplorer();
    const root = explorer.getTree();
    const docs = root.children.find((c) => c.name === 'Documents');

    const { result } = renderHook(
      () => ({
        isDocsExpanded: useIsExpanded(docs.id),
        actions: useUiActions(),
      }),
      { wrapper: createWrapper(explorer) }
    );

    expect(result.current.isDocsExpanded).toBe(false);

    act(() => {
      result.current.actions.toggleExpanded(docs.id);
    });
    expect(result.current.isDocsExpanded).toBe(true);

    act(() => {
      result.current.actions.toggleExpanded(docs.id);
    });
    expect(result.current.isDocsExpanded).toBe(false);
  });

  it('select changes the selected id, and clearSelection clears it', () => {
    const explorer = new FileExplorer();
    const root = explorer.getTree();
    const notes = root.children.find((c) => c.name === 'Notes.txt');

    const { result } = renderHook(
      () => ({
        selectedId: useSelectedId(),
        isNotesSelected: useIsSelected(notes.id),
        actions: useUiActions(),
      }),
      { wrapper: createWrapper(explorer) }
    );

    expect(result.current.selectedId).toBeNull();
    expect(result.current.isNotesSelected).toBe(false);

    act(() => {
      result.current.actions.select(notes.id);
    });
    expect(result.current.selectedId).toBe(notes.id);
    expect(result.current.isNotesSelected).toBe(true);

    act(() => {
      result.current.actions.clearSelection();
    });
    expect(result.current.selectedId).toBeNull();
    expect(result.current.isNotesSelected).toBe(false);
  });

  it('selecting the already selected id, or expanding an already expanded folder, does not notify subscribers or re-render consumers', () => {
    const explorer = new FileExplorer();
    const root = explorer.getTree();
    const notes = root.children.find((c) => c.name === 'Notes.txt');

    let selectRenderCount = 0;
    let expandRenderCount = 0;

    function SelectConsumer() {
      selectRenderCount++;
      const selectedId = useSelectedId();
      return <div>Selected: {selectedId}</div>;
    }

    function ExpandConsumer() {
      expandRenderCount++;
      const isExpanded = useIsExpanded(root.id);
      return <div>Expanded: {String(isExpanded)}</div>;
    }

    let actions;
    function ActionsConsumer() {
      actions = useUiActions();
      return null;
    }

    render(
      <ExplorerProvider explorer={explorer}>
        <UiStateProvider>
          <SelectConsumer />
          <ExpandConsumer />
          <ActionsConsumer />
        </UiStateProvider>
      </ExplorerProvider>
    );

    expect(selectRenderCount).toBe(1);
    expect(expandRenderCount).toBe(1);

    act(() => {
      actions.select(notes.id);
    });
    expect(selectRenderCount).toBe(2);

    // Re-select same id does not cause re-render
    act(() => {
      actions.select(notes.id);
    });
    expect(selectRenderCount).toBe(2);

    // Root is already expanded: re-expanding does not cause re-render
    act(() => {
      actions.setExpanded(root.id, true);
    });
    expect(expandRenderCount).toBe(1);
  });

  it('useUiActions returns the same object reference across re-renders', () => {
    const explorer = new FileExplorer();
    const { result, rerender } = renderHook(() => useUiActions(), {
      wrapper: createWrapper(explorer),
    });

    const firstActions = result.current;
    rerender();
    expect(result.current).toBe(firstActions);
  });

  it('a component using useIsSelected(id) re-renders only when that id selected state changes, and useIsExpanded(id) only when that id expanded state changes', () => {
    const explorer = new FileExplorer();
    const root = explorer.getTree();
    const docs = root.children.find((c) => c.name === 'Documents');
    const notes = root.children.find((c) => c.name === 'Notes.txt');

    let docsSelectedRenders = 0;
    let notesSelectedRenders = 0;
    let docsExpandedRenders = 0;

    function DocsWatcher() {
      docsSelectedRenders++;
      const isSelected = useIsSelected(docs.id);
      return <div>Docs selected: {String(isSelected)}</div>;
    }

    function NotesWatcher() {
      notesSelectedRenders++;
      const isSelected = useIsSelected(notes.id);
      return <div>Notes selected: {String(isSelected)}</div>;
    }

    function DocsExpandWatcher() {
      docsExpandedRenders++;
      const isExpanded = useIsExpanded(docs.id);
      return <div>Docs expanded: {String(isExpanded)}</div>;
    }

    let actions;
    function Controls() {
      actions = useUiActions();
      return null;
    }

    render(
      <ExplorerProvider explorer={explorer}>
        <UiStateProvider>
          <DocsWatcher />
          <NotesWatcher />
          <DocsExpandWatcher />
          <Controls />
        </UiStateProvider>
      </ExplorerProvider>
    );

    expect(docsSelectedRenders).toBe(1);
    expect(notesSelectedRenders).toBe(1);
    expect(docsExpandedRenders).toBe(1);

    // Select notes: only NotesWatcher should re-render
    act(() => {
      actions.select(notes.id);
    });
    expect(notesSelectedRenders).toBe(2);
    expect(docsSelectedRenders).toBe(1);
    expect(docsExpandedRenders).toBe(1);

    // Expand docs: only DocsExpandWatcher should re-render
    act(() => {
      actions.toggleExpanded(docs.id);
    });
    expect(docsExpandedRenders).toBe(2);
    expect(docsSelectedRenders).toBe(1);
    expect(notesSelectedRenders).toBe(2);

    // Select docs: NotesWatcher and DocsWatcher should re-render
    act(() => {
      actions.select(docs.id);
    });
    expect(docsSelectedRenders).toBe(2);
    expect(notesSelectedRenders).toBe(3);
    expect(docsExpandedRenders).toBe(2);
  });

  it('using the hooks outside UiStateProvider throws a clear error', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => renderHook(() => useIsExpanded('123'))).toThrow(
      'UI state hooks must be used within a UiStateProvider'
    );
    expect(() => renderHook(() => useIsSelected('123'))).toThrow(
      'UI state hooks must be used within a UiStateProvider'
    );
    expect(() => renderHook(() => useSelectedId())).toThrow(
      'UI state hooks must be used within a UiStateProvider'
    );
    expect(() => renderHook(() => useUiActions())).toThrow(
      'UI state hooks must be used within a UiStateProvider'
    );

    spy.mockRestore();
  });
});
