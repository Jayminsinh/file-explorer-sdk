# File Explorer SDK

A framework-agnostic JavaScript SDK that manages an in-memory file and folder hierarchy, and a React application that uses it. The SDK owns all file data. React only holds UI state.

## Overview

- `src/sdk` is a standalone SDK with no React imports. It handles the hierarchy, validation, search, undo/redo, atomic transactions and change notifications.
- `src/` (the rest) is a React app built with Vite and Tailwind CSS. It reads SDK data through `useSyncExternalStore` and never stores file data in React state.

## Tech Stack

- JavaScript (ES modules), React, Vite
- Tailwind CSS v4 (CSS-first theme, light and dark), react-icons
- Vitest, React Testing Library, jsdom
- No third-party file-management, event-emitter or undo/redo libraries

## Installation

Requires Node 18 or higher.

```bash
npm install
```

## Running the App

```bash
npm run dev
```

Production build: `npm run build`.

## Running Tests

```bash
npm run test
```

Watch mode: `npm run test:watch`.

## Project Structure

```
src/
  sdk/            FileExplorer.js, history.js, search.js, emitter.js, errors.js, index.js
  context/        Explorer, UiState, MultiSelect, Feedback, Activity, Theme providers
  hooks/          useFileExplorer, useExplorerActions, useSearch, useBulkDelete, ...
  components/     FileTree, Toolbar, Dialogs, Search, DetailsPanel, ActivityPanel, ...
  utils/          tree helpers, structural sharing
tests/
  sdk/            SDK tests
  ui/             React tests
docs/             API.md, ARCHITECTURE.md, UNDO_REDO.md
```

## SDK Documentation

See [docs/API.md](docs/API.md).

## Architecture

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Undo/Redo

See [docs/UNDO_REDO.md](docs/UNDO_REDO.md).

## Rendering Behavior

`TreeNode` is wrapped in `React.memo` and logs `render TreeNode: <name>` to the console. Observed behavior:

| Action | Nodes that re-render |
|---|---|
| Expand or collapse a folder | That folder, plus children that become visible |
| Select a file | Only the previously selected node and the newly selected node |
| Rename a file | The changed node and its ancestors only; siblings do not re-render |
| Create an item | The parent folder, its ancestors and the new node |
| Delete a folder | Its ancestors only; the removed nodes unmount |
| Type in the search box | None (the tree is replaced by the results list) |
| Toggle the theme | None |

Techniques used and why:

- **Narrow subscriptions.** Expanded and selected state live in a small external store. Each node subscribes only to its own `isExpanded` and `isSelected` booleans with `useSyncExternalStore`, so a click re-renders only the nodes whose booleans changed. No `expandedIds` or `selectedId` props are passed down.
- **Structural sharing.** The SDK builds a new snapshot after each change. The hook layer reuses unchanged subtrees from the previous snapshot, so a node keeps the same object reference when nothing under it changed.
- **`React.memo` on `TreeNode`.** Together with structural sharing, memo skips every unchanged branch.
- **Stable references.** Handlers use `useCallback`, the UI action objects are created once, and derived lists use `useMemo`.
- **Stable provider values.** Context values are the SDK instance or stable stores, so providers never re-render consumers on their own.

## Bonus Features

- Atomic transactions (`explorer.transaction`), including a single undo entry per transaction.
- Multi-selection (checkboxes and Ctrl/Cmd+click) with bulk delete in one transaction.
- Light and dark theme with a toggle (not required by the task).

## Known Limitations

- Two UI tests currently fail: one Toolbar test expecting an inline `role="alert"` message, and one test that compares tree nodes by reference, which changed after structural sharing was added. The application behaves correctly in the browser. Both tests need updating.
- The SDK is synchronous. The UI keeps a pending flag for every action so asynchronous operations could be added, but today it only spans one tick.
- Data is in memory only and resets on page refresh.
- The activity panel describes changes by comparing tree snapshots, so an undo appears as the reverse action (for example, undoing a create is logged as a delete).
- Undo history is capped at 100 entries.
- Selection and expansion state are not persisted.
- Moving items by drag and drop is not implemented.