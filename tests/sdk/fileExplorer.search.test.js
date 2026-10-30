import { FileExplorer } from '../../src/sdk/FileExplorer.js';
import { ERROR_CODES, InvalidSearchOptionsError } from '../../src/sdk/errors.js';

describe('FileExplorer - Search operations', () => {
  it('search finds files and folders by name, case-insensitively (for example "doc" and "DOC" both match "Documents" and "Project Plan.docx")', () => {
    const explorer = new FileExplorer();
    const resLower = explorer.searchItems({ query: 'doc' });
    const resUpper = explorer.searchItems({ query: 'DOC' });

    expect(resLower.total).toBe(2);
    expect(resUpper.total).toBe(2);

    const namesLower = resLower.items.map((i) => i.name);
    const namesUpper = resUpper.items.map((i) => i.name);
    expect(namesLower).toContain('Documents');
    expect(namesLower).toContain('Project Plan.docx');
    expect(namesUpper).toEqual(namesLower);
  });

  it('search finds nested items at any depth, including ones in newly created deep folders', () => {
    const explorer = new FileExplorer();
    const root = explorer.getTree();
    const docs = root.children.find((c) => c.name === 'Documents');
    const level1 = explorer.createFolder(docs.id, 'DeepLevel1');
    const level2 = explorer.createFolder(level1.id, 'DeepLevel2');
    const deepFile = explorer.createFile(level2.id, 'SecretDocument.txt');

    const res = explorer.searchItems({ query: 'Secret' });
    expect(res.total).toBe(1);
    expect(res.items[0].id).toBe(deepFile.id);
    expect(res.items[0].name).toBe('SecretDocument.txt');
    expect(res.items[0].location).toBe('My Files / Documents / DeepLevel1 / DeepLevel2');
  });

  it('the root folder is never part of the results', () => {
    const explorer = new FileExplorer();
    const res = explorer.searchItems({ query: 'Files' });

    expect(res.items.some((i) => i.name === 'My Files')).toBe(false);
    expect(res.total).toBe(0);
  });

  it('the type option filters to only files or only folders, and "all" returns both', () => {
    const explorer = new FileExplorer();
    const allResults = explorer.searchItems({ query: 'o', type: 'all' });
    const filesOnly = explorer.searchItems({ query: 'o', type: 'file' });
    const foldersOnly = explorer.searchItems({ query: 'o', type: 'folder' });

    expect(allResults.items.some((i) => i.type === 'folder')).toBe(true);
    expect(allResults.items.some((i) => i.type === 'file')).toBe(true);

    expect(filesOnly.items.every((i) => i.type === 'file')).toBe(true);
    expect(foldersOnly.items.every((i) => i.type === 'folder')).toBe(true);
    expect(filesOnly.total + foldersOnly.total).toBe(allResults.total);
  });

  it('each result has id, name, type, parentId and a readable location such as "My Files / Documents"', () => {
    const explorer = new FileExplorer();
    const res = explorer.searchItems({ query: 'Resume' });

    expect(res.total).toBe(1);
    const item = res.items[0];

    expect(item).toEqual({
      id: expect.any(String),
      name: 'Resume.pdf',
      type: 'file',
      parentId: expect.any(String),
      location: 'My Files / Documents',
    });
  });

  it('sorting by name, by type and by location works in both asc and desc order, and ties are ordered stably', () => {
    const explorer = new FileExplorer();

    const nameAsc = explorer.searchItems({ query: 'o', sortBy: 'name', sortOrder: 'asc' });
    const namesAscList = nameAsc.items.map((i) => i.name.toLowerCase());
    expect(namesAscList).toEqual([...namesAscList].sort((a, b) => a.localeCompare(b)));

    const nameDesc = explorer.searchItems({ query: 'o', sortBy: 'name', sortOrder: 'desc' });
    const namesDescList = nameDesc.items.map((i) => i.name.toLowerCase());
    expect(namesDescList).toEqual([...namesAscList].reverse());

    const typeAsc = explorer.searchItems({ query: 'o', sortBy: 'type', sortOrder: 'asc' });
    expect(typeAsc.items[0].type).toBe('file');
    const typeDesc = explorer.searchItems({ query: 'o', sortBy: 'type', sortOrder: 'desc' });
    expect(typeDesc.items[0].type).toBe('folder');

    const pathAsc = explorer.searchItems({ query: 'o', sortBy: 'path', sortOrder: 'asc' });
    const pathDesc = explorer.searchItems({ query: 'o', sortBy: 'path', sortOrder: 'desc' });
    const pathsAscList = pathAsc.items.map((i) => i.location);
    const pathsDescList = pathDesc.items.map((i) => i.location);
    expect(pathsDescList).toEqual([...pathsAscList].reverse());
  });

  it('pagination: page and pageSize return the right slice, total counts all matches, totalPages is correct, and a page past the end returns empty items with the correct total', () => {
    const explorer = new FileExplorer();

    const page1 = explorer.searchItems({ query: 'o', page: 1, pageSize: 2 });
    const page2 = explorer.searchItems({ query: 'o', page: 2, pageSize: 2 });
    const page3 = explorer.searchItems({ query: 'o', page: 3, pageSize: 2 });
    const page4 = explorer.searchItems({ query: 'o', page: 4, pageSize: 2 });

    expect(page1.total).toBe(5);
    expect(page1.totalPages).toBe(3);
    expect(page1.items).toHaveLength(2);

    expect(page2.items).toHaveLength(2);
    expect(page2.items[0].id).not.toBe(page1.items[0].id);

    expect(page3.items).toHaveLength(1);

    expect(page4.total).toBe(5);
    expect(page4.totalPages).toBe(3);
    expect(page4.items).toEqual([]);
  });

  it('an empty or whitespace-only query returns zero items and total 0 without throwing', () => {
    const explorer = new FileExplorer();
    const resEmpty = explorer.searchItems({ query: '' });
    expect(resEmpty).toEqual({
      items: [],
      total: 0,
      page: 1,
      pageSize: 10,
      totalPages: 0,
    });

    const resSpaces = explorer.searchItems({ query: '    ' });
    expect(resSpaces).toEqual({
      items: [],
      total: 0,
      page: 1,
      pageSize: 10,
      totalPages: 0,
    });
  });

  it('invalid options are rejected with the invalid-search-options code: options that are not an object, a non-string query, an unknown type, an unknown sortBy, an unknown sortOrder, page 0 or a non-integer page, pageSize 0, and pageSize above the maximum', () => {
    const explorer = new FileExplorer();

    const invalidCases = [
      null,
      undefined,
      'not-an-object',
      [],
      { query: 123 },
      { query: 'test', type: 'unknown' },
      { query: 'test', sortBy: 'unknown' },
      { query: 'test', sortOrder: 'unknown' },
      { query: 'test', page: 0 },
      { query: 'test', page: -1 },
      { query: 'test', page: 1.5 },
      { query: 'test', pageSize: 0 },
      { query: 'test', pageSize: -5 },
      { query: 'test', pageSize: 101 },
    ];

    for (const opts of invalidCases) {
      expect(() => explorer.searchItems(opts)).toThrow(InvalidSearchOptionsError);
      try {
        explorer.searchItems(opts);
      } catch (err) {
        expect(err.code).toBe(ERROR_CODES.INVALID_SEARCH_OPTIONS);
      }
    }
  });

  it('results reflect changes: after create, rename, move and delete, a new search shows the updated names, locations and counts', () => {
    const explorer = new FileExplorer();
    const root = explorer.getTree();
    const docs = root.children.find((c) => c.name === 'Documents');
    const images = root.children.find((c) => c.name === 'Images');

    const newFile = explorer.createFile(docs.id, 'DynamicReport.txt');
    expect(explorer.searchItems({ query: 'DynamicReport' }).total).toBe(1);

    explorer.renameItem(newFile.id, 'RenamedReport.txt');
    expect(explorer.searchItems({ query: 'DynamicReport' }).total).toBe(0);
    expect(explorer.searchItems({ query: 'RenamedReport' }).total).toBe(1);

    explorer.moveItem(newFile.id, images.id);
    const movedRes = explorer.searchItems({ query: 'RenamedReport' });
    expect(movedRes.items[0].location).toBe('My Files / Images');

    explorer.deleteItem(newFile.id);
    expect(explorer.searchItems({ query: 'RenamedReport' }).total).toBe(0);
  });

  it('results also reflect undo and redo (for example, a deleted folder\'s items reappear in search after undo)', () => {
    const explorer = new FileExplorer();
    const root = explorer.getTree();
    const docs = root.children.find((c) => c.name === 'Documents');

    explorer.deleteItem(docs.id);
    expect(explorer.searchItems({ query: 'Resume' }).total).toBe(0);

    explorer.undo();
    expect(explorer.searchItems({ query: 'Resume' }).total).toBe(1);

    explorer.redo();
    expect(explorer.searchItems({ query: 'Resume' }).total).toBe(0);
  });

  it('searching does not modify data: getTree is identical before and after, getSnapshot keeps the same reference, subscribers are not called, and undo history is not affected (canUndo stays the same)', () => {
    const explorer = new FileExplorer();
    const treeBefore = explorer.getTree();
    const snapshotBefore = explorer.getSnapshot();
    const canUndoBefore = explorer.canUndo();

    let subscriberCalled = false;
    explorer.subscribe(() => {
      subscriberCalled = true;
    });

    explorer.searchItems({ query: 'Plan' });

    expect(explorer.getTree()).toEqual(treeBefore);
    expect(explorer.getSnapshot()).toBe(snapshotBefore);
    expect(subscriberCalled).toBe(false);
    expect(explorer.canUndo()).toBe(canUndoBefore);
  });

  it('mutating a returned result item does not change the SDK\'s data or later search results', () => {
    const explorer = new FileExplorer();
    const res = explorer.searchItems({ query: 'Resume' });
    const item = res.items[0];

    item.name = 'Corrupted.pdf';
    item.location = 'Fake / Path';

    const freshSearch = explorer.searchItems({ query: 'Resume' });
    expect(freshSearch.items[0].name).toBe('Resume.pdf');
    expect(freshSearch.items[0].location).toBe('My Files / Documents');
    expect(explorer.getItem(item.id).name).toBe('Resume.pdf');
  });
});
