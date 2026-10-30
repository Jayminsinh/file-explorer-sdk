# Architecture

## Data model

The SDK stores items in a flat `Map` from id to node:

```js
{ id, name, type: 'file' | 'folder', parentId, childIds: [] }   // childIds only on folders
```

Why a flat map instead of a nested tree:

- Lookups, renames and moves are O(1) by id.
- Moving an item only edits two `childIds` arrays and one `parentId`.
- The nested view is built on demand for `getTree()` and `getSnapshot()`.
- Ids come from `crypto.randomUUID()` and never change.

The Map is a private class field, so consumers cannot reach it. Everything returned is a copy or a frozen snapshot.

## SDK layout

| File | Responsibility |
|---|---|
| `FileExplorer.js` | Public API, validation, mutations, snapshots, transactions |
| `history.js` | Undo and redo stacks. Knows nothing about files |
| `search.js` | Pure read-only search, filter, sort and pagination |
| `emitter.js` | Hand-written subscribe and notify |
| `errors.js` | Error classes and codes |

## Change notification and snapshots

Every successful change clears a cached snapshot and notifies subscribers once. `getSnapshot()` returns the same frozen tree until the next change, which is exactly what `useSyncExternalStore` needs.

## React integration

```
ThemeProvider
  ExplorerProvider            holds the one FileExplorer instance
    UiStateProvider           selected id and expanded ids (UI state only)
      MultiSelectProvider     checked ids (UI state only)
        FeedbackProvider      latest error and pending flag
          ActivityProvider    recent changes log
            App
```

Rules:

- The SDK is the only source of file data. No file data is stored in React state.
- `useFileExplorerTree` reads the SDK with `useSyncExternalStore`. It subscribes on mount and unsubscribes on unmount.
- Components never call the SDK directly for changes. They call `useExplorerActions`, which catches errors, reports them to the feedback store and returns `{ ok, value }` or `{ ok: false, error }`.
- Bulk delete uses `explorer.transaction`, so it is one commit and one undo step.
- The activity panel compares snapshots before and after each notification, so it needs no extra data from the SDK.

## Re-render design

Covered in the README under "Rendering Behavior": narrow per-node subscriptions, structural sharing of unchanged subtrees, `React.memo` on `TreeNode`, and stable handlers and context values.

## Theming

All colors are semantic CSS variables (canvas, surface, line, ink, accent and so on) defined once for light and dark. Tailwind maps them to utilities, so components never use raw colors or `dark:` prefixes. The saved theme is applied before first paint to avoid a flash.

## Key decisions

- The SDK is synchronous and framework-agnostic, so it works from any JavaScript app.
- Validation always runs before mutation, which keeps failed calls from corrupting data or history.
- Errors are typed and carry codes so the UI can show specific messages.
- No third-party libraries are used for the core.

## Known limitations

See the README.