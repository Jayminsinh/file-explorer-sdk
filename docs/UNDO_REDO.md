# Undo and Redo

## How history works

`history.js` keeps two stacks, **undo** and **redo**. It knows nothing about files; an entry is any object.

- A successful operation pushes one entry onto the undo stack.
- `undo()` pops the latest entry, applies its reverse, and moves the entry to the redo stack.
- `redo()` pops from the redo stack, reapplies the entry, and moves it back to the undo stack.
- The undo stack is capped at 100 entries. The oldest entry is dropped first.

## What each entry stores

Entries store small records of the change, not copies of the whole tree.

| Operation | Stored |
|---|---|
| Create | The new node's data, its parent id and its index in the parent |
| Rename | The item id, old name and new name |
| Move | The item id, old parent, old index and new parent |
| Delete | Every removed node with its original id, the original parent id and the original index |
| Transaction | A deep copy of the data before and after the transaction |

## Rules

- **Failed operations never create history.** An entry is pushed only after the change has fully succeeded.
- **No-op operations never create history.** Renaming to the same name or moving into the current parent does nothing.
- **A new operation after an undo clears the redo stack.** Once you change something new, the undone future is gone.
- **Undo and redo never re-validate or push history.** They run in strict stack order, so the tree is always in the exact state the entry expects.
- **Searching, reading and subscribing never touch history.**

## Restoring deleted folders

A delete entry holds every removed node with its original id, plus the parent id and the position the folder had. Undo puts the nodes back into the data, and reinserts the folder at its original index in the parent. Ids, names and order match what existed before the delete. Redo removes the same subtree again.

## Transactions

A successful transaction is exactly one history entry. Undo restores the "before" copy and redo restores the "after" copy, each with one notification. A failed transaction adds no entry.

## Notifications

`undo()` and `redo()` each refresh the snapshot and notify subscribers once. They return a short description of what was reversed or reapplied.

## When there is nothing to do

`undo()` with an empty undo stack throws `NOTHING_TO_UNDO`. `redo()` with an empty redo stack throws `NOTHING_TO_REDO`. Neither changes data or the snapshot.