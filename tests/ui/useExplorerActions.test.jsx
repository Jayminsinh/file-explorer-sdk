import { renderHook, act } from '@testing-library/react';
import { useExplorerActions } from '../../src/hooks/useExplorerActions.js';
import { useFeedbackError, useIsPending } from '../../src/context/FeedbackContext.jsx';
import { useSelectedId, useUiActions } from '../../src/context/UiStateContext.jsx';
import { FileExplorer } from '../../src/sdk/FileExplorer.js';
import { createWrapper } from './renderWithProviders.jsx';

describe('useExplorerActions', () => {
  it('each action (createFile, createFolder, renameItem, moveItem, deleteItem, undo, redo) calls the SDK and returns { ok: true, value }', async () => {
    const explorer = new FileExplorer();
    const { result } = renderHook(
      () => ({
        actions: useExplorerActions(),
      }),
      { wrapper: createWrapper(explorer) }
    );

    const root = explorer.getTree();

    // 1. createFolder
    const folderRes = await result.current.actions.createFolder(root.id, 'NewFolder');
    expect(folderRes.ok).toBe(true);
    expect(folderRes.value.name).toBe('NewFolder');

    // 2. createFile
    const fileRes = await result.current.actions.createFile(folderRes.value.id, 'test.txt');
    expect(fileRes.ok).toBe(true);
    expect(fileRes.value.name).toBe('test.txt');

    // 3. renameItem
    const renameRes = await result.current.actions.renameItem(fileRes.value.id, 'renamed.txt');
    expect(renameRes.ok).toBe(true);
    expect(renameRes.value.name).toBe('renamed.txt');

    // 4. moveItem
    const moveRes = await result.current.actions.moveItem(fileRes.value.id, root.id);
    expect(moveRes.ok).toBe(true);
    expect(moveRes.value.parentId).toBe(root.id);

    // 5. deleteItem — SDK's deleteItem returns the deleted tree node
    const deleteRes = await result.current.actions.deleteItem(fileRes.value.id);
    expect(deleteRes.ok).toBe(true);
    expect(deleteRes.value.id).toBe(fileRes.value.id);
    expect(deleteRes.value.name).toBe('renamed.txt');

    // 6. undo
    const undoRes = await result.current.actions.undo();
    expect(undoRes.ok).toBe(true);

    // 7. redo
    const redoRes = await result.current.actions.redo();
    expect(redoRes.ok).toBe(true);
  });

  it('a failing action (duplicate name, invalid name, moving a folder into its descendant, unknown id, undo with nothing to undo) returns { ok: false, error }, never throws, and reports the error to the feedback store', async () => {
    const explorer = new FileExplorer();
    const { result } = renderHook(
      () => ({
        actions: useExplorerActions(),
        error: useFeedbackError(),
      }),
      { wrapper: createWrapper(explorer) }
    );

    const root = explorer.getTree();

    // Duplicate name
    const dupRes = await result.current.actions.createFolder(root.id, 'Documents');
    expect(dupRes.ok).toBe(false);
    expect(dupRes.error).toBeDefined();
    expect(result.current.error.message).toBe(dupRes.error.message);

    // Invalid name
    const invalidRes = await result.current.actions.createFile(root.id, 'invalid/name.txt');
    expect(invalidRes.ok).toBe(false);
    expect(invalidRes.error).toBeDefined();
    expect(result.current.error.message).toBe(invalidRes.error.message);

    // Moving a folder into its descendant
    const docs = root.children.find((c) => c.name === 'Documents');
    const subRes = await result.current.actions.createFolder(docs.id, 'ChildFolder');
    const moveRes = await result.current.actions.moveItem(docs.id, subRes.value.id);
    expect(moveRes.ok).toBe(false);
    expect(moveRes.error).toBeDefined();
    expect(result.current.error.message).toBe(moveRes.error.message);

    // Unknown id
    const deleteRes = await result.current.actions.deleteItem('non-existent-id');
    expect(deleteRes.ok).toBe(false);
    expect(deleteRes.error).toBeDefined();
    expect(result.current.error.message).toBe(deleteRes.error.message);

    // Undo with nothing to undo (on a fresh explorer instance)
    const freshExplorer = new FileExplorer();
    const { result: freshResult } = renderHook(
      () => ({
        actions: useExplorerActions(),
        error: useFeedbackError(),
      }),
      { wrapper: createWrapper(freshExplorer) }
    );
    const undoRes = await freshResult.current.actions.undo();
    expect(undoRes.ok).toBe(false);
    expect(undoRes.error).toBeDefined();
    expect(freshResult.current.error.message).toBe(undoRes.error.message);
  });

  it('a successful action clears the previous error', async () => {
    const explorer = new FileExplorer();
    const { result } = renderHook(
      () => ({
        actions: useExplorerActions(),
        error: useFeedbackError(),
      }),
      { wrapper: createWrapper(explorer) }
    );

    const root = explorer.getTree();

    // Cause an error
    await result.current.actions.createFolder(root.id, 'Documents');
    expect(result.current.error).not.toBeNull();

    // Successful action clears the error
    const successRes = await result.current.actions.createFolder(root.id, 'UniqueFolder');
    expect(successRes.ok).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it('pending is false after the action finishes, for both success and failure', async () => {
    const explorer = new FileExplorer();
    const { result } = renderHook(
      () => ({
        actions: useExplorerActions(),
        isPending: useIsPending(),
      }),
      { wrapper: createWrapper(explorer) }
    );

    const root = explorer.getTree();

    // Success
    await result.current.actions.createFolder(root.id, 'Folder1');
    expect(result.current.isPending).toBe(false);

    // Failure
    await result.current.actions.createFolder(root.id, 'Documents');
    expect(result.current.isPending).toBe(false);
  });

  it('the returned actions object keeps the same reference across re-renders', () => {
    const explorer = new FileExplorer();
    const { result, rerender } = renderHook(() => useExplorerActions(), {
      wrapper: createWrapper(explorer),
    });

    const initialActions = result.current;
    rerender();
    expect(result.current).toBe(initialActions);
  });

  it('after deleting the selected item, the selection is cleared; after deleting a different item, the selection stays', async () => {
    const explorer = new FileExplorer();
    const { result } = renderHook(
      () => ({
        actions: useExplorerActions(),
        uiActions: useUiActions(),
        selectedId: useSelectedId(),
      }),
      { wrapper: createWrapper(explorer) }
    );

    const root = explorer.getTree();
    const notes = root.children.find((c) => c.name === 'Notes.txt');
    const images = root.children.find((c) => c.name === 'Images');

    // Select Notes.txt
    act(() => {
      result.current.uiActions.select(notes.id);
    });
    expect(result.current.selectedId).toBe(notes.id);

    // Delete Images (different item) -> selection stays on Notes.txt
    await result.current.actions.deleteItem(images.id);
    expect(result.current.selectedId).toBe(notes.id);

    // Delete Notes.txt (selected item) -> selection is cleared
    await result.current.actions.deleteItem(notes.id);
    expect(result.current.selectedId).toBeNull();
  });

  it('after a successful create, the new item becomes selected', async () => {
    const explorer = new FileExplorer();
    const { result } = renderHook(
      () => ({
        actions: useExplorerActions(),
        selectedId: useSelectedId(),
      }),
      { wrapper: createWrapper(explorer) }
    );

    const root = explorer.getTree();

    const fileRes = await result.current.actions.createFile(root.id, 'SelectedFile.txt');
    expect(fileRes.ok).toBe(true);
    expect(result.current.selectedId).toBe(fileRes.value.id);

    const folderRes = await result.current.actions.createFolder(root.id, 'SelectedFolder');
    expect(folderRes.ok).toBe(true);
    expect(result.current.selectedId).toBe(folderRes.value.id);
  });
});
