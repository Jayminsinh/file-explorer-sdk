import { FileExplorer } from '../../src/sdk/FileExplorer.js';
import {
  ERROR_CODES,
  NothingToUndoError,
  NothingToRedoError,
  DuplicateNameError,
} from '../../src/sdk/errors.js';

describe('FileExplorer - Undo / Redo operations', () => {
  it('undo of a create removes the item, and redo brings it back with the same id', () => {
    const explorer = new FileExplorer();
    const root = explorer.getTree();
    const file = explorer.createFile(root.id, 'New.txt');

    explorer.undo();
    expect(explorer.getTree().children.some((c) => c.id === file.id)).toBe(false);
    expect(() => explorer.getItem(file.id)).toThrow();

    explorer.redo();
    expect(explorer.getTree().children.some((c) => c.id === file.id)).toBe(true);
    expect(explorer.getItem(file.id).id).toBe(file.id);
    expect(explorer.getItem(file.id).name).toBe('New.txt');
  });

  it('undo of a rename restores the old name, and redo reapplies the new name, with the same id', () => {
    const explorer = new FileExplorer();
    const root = explorer.getTree();
    const notes = root.children.find((c) => c.name === 'Notes.txt');

    explorer.renameItem(notes.id, 'Todos.txt');
    expect(explorer.getItem(notes.id).name).toBe('Todos.txt');

    explorer.undo();
    expect(explorer.getItem(notes.id).name).toBe('Notes.txt');
    expect(explorer.getItem(notes.id).id).toBe(notes.id);

    explorer.redo();
    expect(explorer.getItem(notes.id).name).toBe('Todos.txt');
    expect(explorer.getItem(notes.id).id).toBe(notes.id);
  });

  it('undo of a move puts the item back in its old parent at its old position, and redo moves it again', () => {
    const explorer = new FileExplorer();
    const root = explorer.getTree();
    const docs = root.children.find((c) => c.name === 'Documents');
    const images = root.children.find((c) => c.name === 'Images');
    const resume = docs.children.find((c) => c.name === 'Resume.pdf');
    const originalIndex = docs.children.findIndex((c) => c.id === resume.id);

    explorer.moveItem(resume.id, images.id);
    expect(explorer.getItem(resume.id).parentId).toBe(images.id);

    explorer.undo();
    expect(explorer.getItem(resume.id).parentId).toBe(docs.id);
    const docsAfterUndo = explorer.getTree().children.find((c) => c.id === docs.id);
    expect(docsAfterUndo.children[originalIndex].id).toBe(resume.id);

    explorer.redo();
    expect(explorer.getItem(resume.id).parentId).toBe(images.id);
    const imagesAfterRedo = explorer.getTree().children.find((c) => c.id === images.id);
    expect(imagesAfterRedo.children.some((c) => c.id === resume.id)).toBe(true);
  });

  it('undo of a file delete restores the file at its original position among its siblings', () => {
    const explorer = new FileExplorer();
    const root = explorer.getTree();
    const docs = root.children.find((c) => c.name === 'Documents');
    const resume = docs.children[0];
    const plan = docs.children[1];

    explorer.deleteItem(resume.id);
    expect(explorer.getTree().children.find((c) => c.id === docs.id).children).toHaveLength(1);

    explorer.undo();
    const docsAfterUndo = explorer.getTree().children.find((c) => c.id === docs.id);
    expect(docsAfterUndo.children).toHaveLength(2);
    expect(docsAfterUndo.children[0].id).toBe(resume.id);
    expect(docsAfterUndo.children[1].id).toBe(plan.id);
    expect(explorer.getItem(resume.id).name).toBe('Resume.pdf');
  });

  it('undo of a folder delete restores the complete nested structure with the same ids, names and order; compare getTree before the delete and after the undo with toEqual', () => {
    const explorer = new FileExplorer();
    const treeBefore = explorer.getTree();
    const docs = treeBefore.children.find((c) => c.name === 'Documents');

    explorer.deleteItem(docs.id);
    expect(explorer.getTree().children.some((c) => c.id === docs.id)).toBe(false);

    explorer.undo();
    const treeAfterUndo = explorer.getTree();
    expect(treeAfterUndo).toEqual(treeBefore);
  });

  it('redo of a folder delete removes the whole subtree again', () => {
    const explorer = new FileExplorer();
    const root = explorer.getTree();
    const docs = root.children.find((c) => c.name === 'Documents');
    const childIds = docs.children.map((c) => c.id);

    explorer.deleteItem(docs.id);
    explorer.undo();
    explorer.redo();

    expect(explorer.getTree().children.some((c) => c.id === docs.id)).toBe(false);
    expect(() => explorer.getItem(docs.id)).toThrow();
    for (const id of childIds) {
      expect(() => explorer.getItem(id)).toThrow();
    }
  });

  it('several operations undone one by one in reverse order bring the tree back to the initial state, and redoing them all returns to the final state', () => {
    const explorer = new FileExplorer();
    const initialTree = explorer.getTree();

    const f1 = explorer.createFile(initialTree.id, 'Task.txt');
    const f2 = explorer.createFolder(initialTree.id, 'Music');
    explorer.renameItem(f1.id, 'TasksDone.txt');
    explorer.moveItem(f1.id, f2.id);
    const finalTree = explorer.getTree();

    explorer.undo();
    explorer.undo();
    explorer.undo();
    explorer.undo();
    expect(explorer.getTree()).toEqual(initialTree);

    explorer.redo();
    explorer.redo();
    explorer.redo();
    explorer.redo();
    expect(explorer.getTree()).toEqual(finalTree);
  });

  it('a failed operation (for example a duplicate name) does not add a history entry, so canUndo stays the same and undo still reverses the previous successful operation', () => {
    const explorer = new FileExplorer();
    const root = explorer.getTree();
    const f = explorer.createFile(root.id, 'Original.txt');

    expect(explorer.canUndo()).toBe(true);

    expect(() => explorer.createFile(root.id, 'Original.txt')).toThrow();
    expect(explorer.canUndo()).toBe(true);

    explorer.undo();
    expect(explorer.getTree().children.some((c) => c.id === f.id)).toBe(false);
  });

  it('no-op operations (renaming to the same name, moving into the same parent) do not add a history entry', () => {
    const explorer = new FileExplorer();
    const root = explorer.getTree();
    const notes = root.children.find((c) => c.name === 'Notes.txt');

    expect(explorer.canUndo()).toBe(false);

    explorer.renameItem(notes.id, 'Notes.txt');
    expect(explorer.canUndo()).toBe(false);

    explorer.moveItem(notes.id, root.id);
    expect(explorer.canUndo()).toBe(false);
  });

  it('performing a new operation after an undo clears the redo history, so canRedo is false and redo throws the nothing-to-redo code', () => {
    const explorer = new FileExplorer();
    const root = explorer.getTree();
    explorer.createFile(root.id, 'One.txt');
    explorer.undo();

    expect(explorer.canRedo()).toBe(true);

    explorer.createFile(root.id, 'Two.txt');
    expect(explorer.canRedo()).toBe(false);

    expect(() => explorer.redo()).toThrow(NothingToRedoError);
    try {
      explorer.redo();
    } catch (err) {
      expect(err.code).toBe(ERROR_CODES.NOTHING_TO_REDO);
    }
  });

  it('undo and redo with nothing to do throw the right codes and leave the tree and snapshot unchanged', () => {
    const explorer = new FileExplorer();
    const treeBefore = explorer.getTree();
    const snapshotBefore = explorer.getSnapshot();

    expect(() => explorer.undo()).toThrow(NothingToUndoError);
    try {
      explorer.undo();
    } catch (err) {
      expect(err.code).toBe(ERROR_CODES.NOTHING_TO_UNDO);
    }

    expect(() => explorer.redo()).toThrow(NothingToRedoError);
    try {
      explorer.redo();
    } catch (err) {
      expect(err.code).toBe(ERROR_CODES.NOTHING_TO_REDO);
    }

    expect(explorer.getTree()).toEqual(treeBefore);
    expect(explorer.getSnapshot()).toBe(snapshotBefore);
  });

  it('subscribers are called exactly once for each undo and each redo', () => {
    const explorer = new FileExplorer();
    const root = explorer.getTree();
    explorer.createFile(root.id, 'SubTest.txt');

    let callCount = 0;
    explorer.subscribe(() => {
      callCount++;
    });

    explorer.undo();
    expect(callCount).toBe(1);

    explorer.redo();
    expect(callCount).toBe(2);
  });

  it('getSnapshot returns a new reference after undo and redo', () => {
    const explorer = new FileExplorer();
    const root = explorer.getTree();
    explorer.createFile(root.id, 'SnapTest.txt');

    const snapAfterCreate = explorer.getSnapshot();

    explorer.undo();
    const snapAfterUndo = explorer.getSnapshot();
    expect(snapAfterUndo).not.toBe(snapAfterCreate);

    explorer.redo();
    const snapAfterRedo = explorer.getSnapshot();
    expect(snapAfterRedo).not.toBe(snapAfterUndo);
  });

  it('canUndo and canRedo return the correct booleans after each step', () => {
    const explorer = new FileExplorer();
    const root = explorer.getTree();

    expect(explorer.canUndo()).toBe(false);
    expect(explorer.canRedo()).toBe(false);

    explorer.createFile(root.id, 'Step.txt');
    expect(explorer.canUndo()).toBe(true);
    expect(explorer.canRedo()).toBe(false);

    explorer.undo();
    expect(explorer.canUndo()).toBe(false);
    expect(explorer.canRedo()).toBe(true);

    explorer.redo();
    expect(explorer.canUndo()).toBe(true);
    expect(explorer.canRedo()).toBe(false);
  });

  it('undo and redo return a short description of what was reversed or reapplied', () => {
    const explorer = new FileExplorer();
    const root = explorer.getTree();
    const file = explorer.createFile(root.id, 'Desc.txt');

    const undoDesc = explorer.undo();
    expect(undoDesc).toMatchObject({
      id: file.id,
      name: 'Desc.txt',
    });
    expect(undoDesc.type || undoDesc.action).toBe('create');

    const redoDesc = explorer.redo();
    expect(redoDesc).toMatchObject({
      id: file.id,
      name: 'Desc.txt',
    });
    expect(redoDesc.type || redoDesc.action).toBe('create');
  });

  it('after undoing a delete, a name that was freed by the delete is taken again, so creating the same name in that folder is rejected as a duplicate', () => {
    const explorer = new FileExplorer();
    const root = explorer.getTree();
    const notes = root.children.find((c) => c.name === 'Notes.txt');

    explorer.deleteItem(notes.id);
    explorer.undo();

    expect(() => explorer.createFile(root.id, 'Notes.txt')).toThrow(DuplicateNameError);
    try {
      explorer.createFile(root.id, 'Notes.txt');
    } catch (err) {
      expect(err.code).toBe(ERROR_CODES.DUPLICATE_NAME);
    }
  });
});
