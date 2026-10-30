import { FileExplorer } from '../../src/sdk/FileExplorer.js';
import {
  ERROR_CODES,
  ItemNotFoundError,
  ParentNotAFolderError,
  DuplicateNameError,
  CannotModifyRootError,
  CannotMoveIntoDescendantError,
} from '../../src/sdk/errors.js';

describe('FileExplorer - Move operations', () => {
  it('moving a file into another folder updates its parentId and it appears under the new folder in getTree', () => {
    const explorer = new FileExplorer();
    const tree = explorer.getTree();
    const docs = tree.children.find((c) => c.name === 'Documents');
    const images = tree.children.find((c) => c.name === 'Images');
    const resume = docs.children.find((c) => c.name === 'Resume.pdf');

    const moved = explorer.moveItem(resume.id, images.id);
    expect(moved.parentId).toBe(images.id);

    const updatedTree = explorer.getTree();
    const imagesInTree = updatedTree.children.find((c) => c.id === images.id);
    expect(imagesInTree.children.some((c) => c.id === resume.id)).toBe(true);
  });

  it('the moved item no longer appears under its old folder', () => {
    const explorer = new FileExplorer();
    const tree = explorer.getTree();
    const docs = tree.children.find((c) => c.name === 'Documents');
    const images = tree.children.find((c) => c.name === 'Images');
    const resume = docs.children.find((c) => c.name === 'Resume.pdf');

    explorer.moveItem(resume.id, images.id);

    const updatedTree = explorer.getTree();
    const docsInTree = updatedTree.children.find((c) => c.id === docs.id);
    expect(docsInTree.children.some((c) => c.id === resume.id)).toBe(false);
  });

  it('the item keeps the same id and the same name after a move', () => {
    const explorer = new FileExplorer();
    const tree = explorer.getTree();
    const docs = tree.children.find((c) => c.name === 'Documents');
    const images = tree.children.find((c) => c.name === 'Images');
    const resume = docs.children.find((c) => c.name === 'Resume.pdf');

    const moved = explorer.moveItem(resume.id, images.id);
    expect(moved.id).toBe(resume.id);
    expect(moved.name).toBe('Resume.pdf');
  });

  it('moving a folder keeps all of its children and nested descendants intact, with their ids unchanged', () => {
    const explorer = new FileExplorer();
    const tree = explorer.getTree();
    const docs = tree.children.find((c) => c.name === 'Documents');
    const images = tree.children.find((c) => c.name === 'Images');

    const subFolder = explorer.createFolder(docs.id, 'SubDocs');
    const subFile = explorer.createFile(subFolder.id, 'Nested.txt');

    const resumeId = docs.children.find((c) => c.name === 'Resume.pdf').id;
    const planId = docs.children.find((c) => c.name === 'Project Plan.docx').id;

    explorer.moveItem(docs.id, images.id);

    const updatedTree = explorer.getTree();
    const imagesAfter = updatedTree.children.find((c) => c.id === images.id);
    const docsAfter = imagesAfter.children.find((c) => c.id === docs.id);

    expect(docsAfter.children).toHaveLength(3);
    const resumeAfter = docsAfter.children.find((c) => c.name === 'Resume.pdf');
    const planAfter = docsAfter.children.find((c) => c.name === 'Project Plan.docx');
    const subAfter = docsAfter.children.find((c) => c.name === 'SubDocs');

    expect(resumeAfter.id).toBe(resumeId);
    expect(planAfter.id).toBe(planId);
    expect(subAfter.id).toBe(subFolder.id);
    expect(subAfter.children[0].id).toBe(subFile.id);
  });

  it('an item can be moved into the root folder', () => {
    const explorer = new FileExplorer();
    const tree = explorer.getTree();
    const docs = tree.children.find((c) => c.name === 'Documents');
    const resume = docs.children.find((c) => c.name === 'Resume.pdf');

    const moved = explorer.moveItem(resume.id, tree.id);
    expect(moved.parentId).toBe(tree.id);

    const updatedTree = explorer.getTree();
    expect(updatedTree.children.some((c) => c.id === resume.id)).toBe(true);
  });

  it('moving a folder into itself is rejected with the cannot-move-into-descendant code', () => {
    const explorer = new FileExplorer();
    const tree = explorer.getTree();
    const docs = tree.children.find((c) => c.name === 'Documents');

    expect(() => explorer.moveItem(docs.id, docs.id)).toThrow(CannotMoveIntoDescendantError);
    try {
      explorer.moveItem(docs.id, docs.id);
    } catch (err) {
      expect(err.code).toBe(ERROR_CODES.CANNOT_MOVE_INTO_SELF_OR_DESCENDANT);
    }
  });

  it('moving a folder into its direct child is rejected with the same code', () => {
    const explorer = new FileExplorer();
    const tree = explorer.getTree();
    const docs = tree.children.find((c) => c.name === 'Documents');
    const subFolder = explorer.createFolder(docs.id, 'SubDocs');

    expect(() => explorer.moveItem(docs.id, subFolder.id)).toThrow(CannotMoveIntoDescendantError);
    try {
      explorer.moveItem(docs.id, subFolder.id);
    } catch (err) {
      expect(err.code).toBe(ERROR_CODES.CANNOT_MOVE_INTO_SELF_OR_DESCENDANT);
    }
  });

  it('moving a folder into a deeply nested descendant (two or more levels down) is rejected with the same code', () => {
    const explorer = new FileExplorer();
    const tree = explorer.getTree();
    const docs = tree.children.find((c) => c.name === 'Documents');
    const level1 = explorer.createFolder(docs.id, 'Level1');
    const level2 = explorer.createFolder(level1.id, 'Level2');
    const level3 = explorer.createFolder(level2.id, 'Level3');

    expect(() => explorer.moveItem(docs.id, level3.id)).toThrow(CannotMoveIntoDescendantError);
    try {
      explorer.moveItem(docs.id, level3.id);
    } catch (err) {
      expect(err.code).toBe(ERROR_CODES.CANNOT_MOVE_INTO_SELF_OR_DESCENDANT);
    }
  });

  it('moving an item into a folder that already has a child with the same name is rejected with the duplicate-name code, including with different letter casing', () => {
    const explorer = new FileExplorer();
    const tree = explorer.getTree();
    const docs = tree.children.find((c) => c.name === 'Documents');
    const images = tree.children.find((c) => c.name === 'Images');

    explorer.createFile(images.id, 'resume.PDF');
    const resume = docs.children.find((c) => c.name === 'Resume.pdf');

    expect(() => explorer.moveItem(resume.id, images.id)).toThrow(DuplicateNameError);
    try {
      explorer.moveItem(resume.id, images.id);
    } catch (err) {
      expect(err.code).toBe(ERROR_CODES.DUPLICATE_NAME);
    }
  });

  it('moving an item into a file is rejected with the parent-not-a-folder code', () => {
    const explorer = new FileExplorer();
    const tree = explorer.getTree();
    const notes = tree.children.find((c) => c.name === 'Notes.txt');
    const docs = tree.children.find((c) => c.name === 'Documents');
    const resume = docs.children.find((c) => c.name === 'Resume.pdf');

    expect(() => explorer.moveItem(resume.id, notes.id)).toThrow(ParentNotAFolderError);
    try {
      explorer.moveItem(resume.id, notes.id);
    } catch (err) {
      expect(err.code).toBe(ERROR_CODES.PARENT_NOT_A_FOLDER);
    }
  });

  it('moving an unknown item id is rejected with the item-not-found code', () => {
    const explorer = new FileExplorer();
    const tree = explorer.getTree();

    expect(() => explorer.moveItem('non-existent-id', tree.id)).toThrow(ItemNotFoundError);
    try {
      explorer.moveItem('non-existent-id', tree.id);
    } catch (err) {
      expect(err.code).toBe(ERROR_CODES.ITEM_NOT_FOUND);
    }
  });

  it('moving into an unknown parent id is rejected with the item-not-found code', () => {
    const explorer = new FileExplorer();
    const tree = explorer.getTree();
    const notes = tree.children.find((c) => c.name === 'Notes.txt');

    expect(() => explorer.moveItem(notes.id, 'non-existent-parent')).toThrow(ItemNotFoundError);
    try {
      explorer.moveItem(notes.id, 'non-existent-parent');
    } catch (err) {
      expect(err.code).toBe(ERROR_CODES.ITEM_NOT_FOUND);
    }
  });

  it('moving the root folder is rejected with the cannot-modify-root code', () => {
    const explorer = new FileExplorer();
    const tree = explorer.getTree();
    const docs = tree.children.find((c) => c.name === 'Documents');

    expect(() => explorer.moveItem(tree.id, docs.id)).toThrow(CannotModifyRootError);
    try {
      explorer.moveItem(tree.id, docs.id);
    } catch (err) {
      expect(err.code).toBe(ERROR_CODES.CANNOT_MODIFY_ROOT);
    }
  });

  it('moving an item into the folder it is already in does nothing: no snapshot change and no subscriber call', () => {
    const explorer = new FileExplorer();
    const tree = explorer.getTree();
    const docs = tree.children.find((c) => c.name === 'Documents');
    const resume = docs.children.find((c) => c.name === 'Resume.pdf');
    const initialSnapshot = explorer.getSnapshot();

    let subscriberCalled = false;
    explorer.subscribe(() => {
      subscriberCalled = true;
    });

    const result = explorer.moveItem(resume.id, docs.id);
    expect(result.parentId).toBe(docs.id);
    expect(subscriberCalled).toBe(false);
    expect(explorer.getSnapshot()).toBe(initialSnapshot);
  });

  it('after any failed move, getTree is exactly the same as before and subscribers are not called', () => {
    const explorer = new FileExplorer();
    const tree = explorer.getTree();
    const docs = tree.children.find((c) => c.name === 'Documents');
    const notes = tree.children.find((c) => c.name === 'Notes.txt');
    const initialTree = JSON.stringify(explorer.getTree());

    let subscriberCalled = false;
    explorer.subscribe(() => {
      subscriberCalled = true;
    });

    expect(() => explorer.moveItem(tree.id, docs.id)).toThrow();
    expect(() => explorer.moveItem(docs.id, docs.id)).toThrow();
    expect(() => explorer.moveItem(notes.id, 'bad-parent')).toThrow();
    expect(() => explorer.moveItem('bad-id', docs.id)).toThrow();

    expect(JSON.stringify(explorer.getTree())).toBe(initialTree);
    expect(subscriberCalled).toBe(false);
  });

  it('after a successful move, subscribers are called exactly once', () => {
    const explorer = new FileExplorer();
    const tree = explorer.getTree();
    const docs = tree.children.find((c) => c.name === 'Documents');
    const images = tree.children.find((c) => c.name === 'Images');
    const resume = docs.children.find((c) => c.name === 'Resume.pdf');

    let callCount = 0;
    explorer.subscribe(() => {
      callCount++;
    });

    explorer.moveItem(resume.id, images.id);
    expect(callCount).toBe(1);
  });

  it('getSnapshot returns a new reference after a successful move and the same reference after a failed one', () => {
    const explorer = new FileExplorer();
    const tree = explorer.getTree();
    const docs = tree.children.find((c) => c.name === 'Documents');
    const images = tree.children.find((c) => c.name === 'Images');
    const resume = docs.children.find((c) => c.name === 'Resume.pdf');
    const initialSnapshot = explorer.getSnapshot();

    expect(() => explorer.moveItem(docs.id, docs.id)).toThrow();
    expect(explorer.getSnapshot()).toBe(initialSnapshot);

    explorer.moveItem(resume.id, images.id);
    const newSnapshot = explorer.getSnapshot();
    expect(newSnapshot).not.toBe(initialSnapshot);
    expect(explorer.getSnapshot()).toBe(newSnapshot);
  });

  it('getItem returns the new parentId after a move', () => {
    const explorer = new FileExplorer();
    const tree = explorer.getTree();
    const docs = tree.children.find((c) => c.name === 'Documents');
    const images = tree.children.find((c) => c.name === 'Images');
    const resume = docs.children.find((c) => c.name === 'Resume.pdf');

    explorer.moveItem(resume.id, images.id);
    const item = explorer.getItem(resume.id);
    expect(item.parentId).toBe(images.id);
  });
});
