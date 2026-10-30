import { FileExplorer } from '../../src/sdk/FileExplorer.js';
import { ItemNotFoundError, ERROR_CODES } from '../../src/sdk/errors.js';

describe('FileExplorer - Read operations', () => {
  it('getTree returns the seeded structure: root "My Files" with Documents (Resume.pdf, Project Plan.docx), Images (Photo.png, Logo.svg) and Notes.txt', () => {
    const explorer = new FileExplorer();
    const tree = explorer.getTree();

    expect(tree.name).toBe('My Files');
    expect(tree.type).toBe('folder');
    expect(tree.parentId).toBeNull();
    expect(tree.children).toHaveLength(3);

    const [docs, images, notes] = tree.children;

    expect(docs.name).toBe('Documents');
    expect(docs.type).toBe('folder');
    expect(docs.children).toHaveLength(2);
    expect(docs.children[0].name).toBe('Resume.pdf');
    expect(docs.children[0].type).toBe('file');
    expect(docs.children[1].name).toBe('Project Plan.docx');
    expect(docs.children[1].type).toBe('file');

    expect(images.name).toBe('Images');
    expect(images.type).toBe('folder');
    expect(images.children).toHaveLength(2);
    expect(images.children[0].name).toBe('Photo.png');
    expect(images.children[0].type).toBe('file');
    expect(images.children[1].name).toBe('Logo.svg');
    expect(images.children[1].type).toBe('file');

    expect(notes.name).toBe('Notes.txt');
    expect(notes.type).toBe('file');
    expect(notes.children).toBeUndefined();
  });

  it('every item has a unique id, and a folder\'s children point back to it through parentId', () => {
    const explorer = new FileExplorer();
    const tree = explorer.getTree();

    const seenIds = new Set();
    function validateHierarchy(node, expectedParentId = null) {
      expect(typeof node.id).toBe('string');
      expect(node.id.length).toBeGreaterThan(0);
      expect(seenIds.has(node.id)).toBe(false);
      seenIds.add(node.id);

      expect(node.parentId).toBe(expectedParentId);

      if (node.type === 'folder') {
        expect(Array.isArray(node.children)).toBe(true);
        for (const child of node.children) {
          validateHierarchy(child, node.id);
        }
      }
    }

    validateHierarchy(tree, null);
    expect(seenIds.size).toBe(8);
  });

  it('getItem returns the correct item for a known id', () => {
    const explorer = new FileExplorer();
    const tree = explorer.getTree();
    const rootItem = explorer.getItem(tree.id);

    expect(rootItem).toEqual({
      id: tree.id,
      name: 'My Files',
      type: 'folder',
      parentId: null,
    });

    const docs = tree.children[0];
    const docsItem = explorer.getItem(docs.id);
    expect(docsItem).toEqual({
      id: docs.id,
      name: 'Documents',
      type: 'folder',
      parentId: tree.id,
    });

    const resume = docs.children[0];
    const resumeItem = explorer.getItem(resume.id);
    expect(resumeItem).toEqual({
      id: resume.id,
      name: 'Resume.pdf',
      type: 'file',
      parentId: docs.id,
    });
  });

  it('getItem throws the item-not-found error (check its code from errors.js) for an unknown id', () => {
    const explorer = new FileExplorer();

    expect(() => explorer.getItem('unknown-id')).toThrow(ItemNotFoundError);
    try {
      explorer.getItem('unknown-id');
    } catch (err) {
      expect(err).toBeInstanceOf(ItemNotFoundError);
      expect(err.code).toBe(ERROR_CODES.ITEM_NOT_FOUND);
    }
  });

  it('mutating the object returned by getTree does not change what getTree returns next time', () => {
    const explorer = new FileExplorer();
    const tree1 = explorer.getTree();

    tree1.name = 'Mutated Root';
    tree1.children.push({ id: 'temp', name: 'evil.exe', type: 'file', parentId: tree1.id });
    tree1.children[0].name = 'Mutated Documents';

    const tree2 = explorer.getTree();
    expect(tree2.name).toBe('My Files');
    expect(tree2.children).toHaveLength(3);
    expect(tree2.children[0].name).toBe('Documents');
  });

  it('mutating the object returned by getItem does not change what getItem returns next time', () => {
    const explorer = new FileExplorer();
    const tree = explorer.getTree();

    const item1 = explorer.getItem(tree.id);
    item1.name = 'Mutated Name';

    const item2 = explorer.getItem(tree.id);
    expect(item2.name).toBe('My Files');
  });

  it('getSnapshot returns the same reference when called twice with no changes', () => {
    const explorer = new FileExplorer();
    const snap1 = explorer.getSnapshot();
    const snap2 = explorer.getSnapshot();

    expect(snap1).toBe(snap2);
  });

  it('the snapshot is frozen, so trying to modify it does not change it', () => {
    const explorer = new FileExplorer();
    const snapshot = explorer.getSnapshot();

    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(Object.isFrozen(snapshot.children)).toBe(true);
    expect(Object.isFrozen(snapshot.children[0])).toBe(true);

    expect(() => {
      snapshot.name = 'Modified Name';
    }).toThrow();

    expect(() => {
      snapshot.children.push({});
    }).toThrow();

    expect(snapshot.name).toBe('My Files');
    expect(snapshot.children).toHaveLength(3);
  });
});
