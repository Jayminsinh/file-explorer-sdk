# SDK API

```js
import { FileExplorer } from '../src/sdk/index.js'

const explorer = new FileExplorer()
```

The constructor seeds this structure:

```
My Files
├── Documents  (Resume.pdf, Project Plan.docx)
├── Images     (Photo.png, Logo.svg)
└── Notes.txt
```

## Item shape

```js
{ id, name, type: 'file' | 'folder', parentId }        // getItem, create, rename, move results
{ id, name, type, parentId, children: [...] }          // getTree and deleteItem (folders have children)
```

All returned data is a copy (or a frozen snapshot). Changing it never changes the SDK.

## Errors

Every error is a `FileExplorerError` with a machine-readable `code` and a readable `message`. The exact code strings are in `src/sdk/errors.js`.

| Code | When |
|---|---|
| `ITEM_NOT_FOUND` | An id does not exist |
| `DUPLICATE_NAME` | A sibling already has that name (case-insensitive) |
| `INVALID_NAME` | Empty, whitespace only, not a string, or contains `/` or `\` |
| `PARENT_NOT_A_FOLDER` | The target parent is a file |
| `CANNOT_MOVE_INTO_DESCENDANT` | A folder is moved into itself or a descendant |
| `CANNOT_MODIFY_ROOT` | The root is renamed, moved or deleted |
| `INVALID_SEARCH_OPTIONS` | Bad search options |
| `NOTHING_TO_UNDO` / `NOTHING_TO_REDO` | The history stack is empty |
| `TRANSACTION_FAILED` | A transaction callback failed or was misused |

Validation always happens before any change, so a failed call never changes data, never notifies subscribers and never adds an undo entry.

## Reading

| Method | Returns | Notes |
|---|---|---|
| `getTree()` | Nested copy of the whole hierarchy | |
| `getItem(id)` | Copy of one item | Throws `ITEM_NOT_FOUND` |
| `getSnapshot()` | Frozen tree | Same reference until data changes. Built for `useSyncExternalStore` |
| `searchItems(options)` | See Search | Read-only |
| `canUndo()` / `canRedo()` | boolean | |

## Changing

| Method | Returns | Throws |
|---|---|---|
| `createFile(parentId, name)` | New item | `ITEM_NOT_FOUND`, `PARENT_NOT_A_FOLDER`, `INVALID_NAME`, `DUPLICATE_NAME` |
| `createFolder(parentId, name)` | New item | same as above |
| `renameItem(id, newName)` | Updated item | `ITEM_NOT_FOUND`, `CANNOT_MODIFY_ROOT`, `INVALID_NAME`, `DUPLICATE_NAME` |
| `moveItem(id, newParentId)` | Updated item | `ITEM_NOT_FOUND`, `CANNOT_MODIFY_ROOT`, `PARENT_NOT_A_FOLDER`, `CANNOT_MOVE_INTO_DESCENDANT`, `DUPLICATE_NAME` |
| `deleteItem(id)` | Nested copy of everything removed | `ITEM_NOT_FOUND`, `CANNOT_MODIFY_ROOT` |

Rules:

- Names are trimmed and must be unique inside a folder, ignoring letter casing.
- Changing only the casing of an item's own name is allowed.
- A rename to the same name, or a move into the current parent, does nothing: no notification and no history entry.
- Items keep their id through rename and move.
- Deleting a folder removes all descendants. No orphans remain.

```js
const docs = explorer.getTree().children.find((c) => c.name === 'Documents')
const file = explorer.createFile(docs.id, 'Notes.md')
explorer.renameItem(file.id, 'Todo.md')
explorer.moveItem(file.id, explorer.getTree().id)
explorer.deleteItem(docs.id)   // removes Documents and everything inside
```

## Subscribing

```js
const unsubscribe = explorer.subscribe(() => {
  console.log(explorer.getTree())
})
unsubscribe()
```

- Subscribing the same function twice calls it once per change.
- Calling `unsubscribe` more than once is safe.
- One failing listener does not stop the others.
- Subscribers are notified once per successful change, after the change is complete.

## Search

```js
explorer.searchItems({
  query: 'doc',
  type: 'all',        // 'all' | 'file' | 'folder'
  sortBy: 'name',     // 'name' | 'type' | 'path'
  sortOrder: 'asc',   // 'asc' | 'desc'
  page: 1,
  pageSize: 10,       // 1 to 100
})
// { items, total, page, pageSize, totalPages }
```

Each item is `{ id, name, type, parentId, location }` where `location` looks like `My Files / Documents`.

- Matching is a case-insensitive "name contains query" check at every depth.
- The root is not included.
- An empty or whitespace-only query returns zero items, not an error.
- Invalid options throw `INVALID_SEARCH_OPTIONS`.
- Search never changes data, never notifies and never touches history.

## Undo and redo

```js
explorer.undo()   // returns a short description of what was undone
explorer.redo()
```

See [UNDO_REDO.md](UNDO_REDO.md).

## Transactions

```js
explorer.transaction((tx) => {
  const archive = tx.createFolder(rootId, 'Archive')
  tx.moveItem(notesId, archive.id)
  tx.renameItem(docsId, 'Docs')
})
```

`tx` has `createFile`, `createFolder`, `renameItem`, `moveItem` and `deleteItem` with the same arguments and validation as the public methods. Ids returned by earlier operations can be used by later ones.

- All operations succeed together or none are applied.
- Subscribers are notified once, after a successful commit.
- A successful transaction is one undo entry.
- A failed transaction leaves data, snapshot and history untouched and throws `TRANSACTION_FAILED` with the original error as its cause.
- The callback must be synchronous. Async callbacks and nested transactions are rejected.
- A callback that changes nothing does not notify and adds no history entry.

How it works: the callback runs against a working copy of the data. On success the copy replaces the real data in one swap. On failure the copy is discarded.