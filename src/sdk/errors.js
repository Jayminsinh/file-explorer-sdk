export const ERROR_CODES = Object.freeze({
  ITEM_NOT_FOUND: 'ITEM_NOT_FOUND',
  DUPLICATE_NAME: 'DUPLICATE_NAME',
  INVALID_NAME: 'INVALID_NAME',
  PARENT_NOT_A_FOLDER: 'PARENT_NOT_A_FOLDER',
  CANNOT_MOVE_INTO_SELF_OR_DESCENDANT: 'CANNOT_MOVE_INTO_SELF_OR_DESCENDANT',
  CANNOT_MODIFY_ROOT: 'CANNOT_MODIFY_ROOT',
  INVALID_SEARCH_OPTIONS: 'INVALID_SEARCH_OPTIONS',
  NOTHING_TO_UNDO: 'NOTHING_TO_UNDO',
  NOTHING_TO_REDO: 'NOTHING_TO_REDO',
  TRANSACTION_FAILED: 'TRANSACTION_FAILED',
});

export class FileExplorerError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'FileExplorerError';
    this.code = code;
  }
}

export class ItemNotFoundError extends FileExplorerError {
  constructor(id) {
    super(
      ERROR_CODES.ITEM_NOT_FOUND,
      id ? `Item not found with id "${id}".` : 'Item not found.'
    );
    this.name = 'ItemNotFoundError';
    this.id = id;
  }
}

export class DuplicateNameError extends FileExplorerError {
  constructor(name, folderId) {
    const location = folderId ? ` in folder "${folderId}"` : '';
    super(
      ERROR_CODES.DUPLICATE_NAME,
      `An item named "${name}" already exists${location}.`
    );
    this.name = 'DuplicateNameError';
    this.itemName = name;
    this.folderId = folderId;
  }
}

export class InvalidNameError extends FileExplorerError {
  constructor(name, reason) {
    const details = reason ? `: ${reason}` : ' (names cannot be empty, whitespace-only, or contain "/" or "\\")';
    super(
      ERROR_CODES.INVALID_NAME,
      `Invalid item name "${name}"${details}`
    );
    this.name = 'InvalidNameError';
    this.itemName = name;
  }
}

export class ParentNotAFolderError extends FileExplorerError {
  constructor(parentId) {
    super(
      ERROR_CODES.PARENT_NOT_A_FOLDER,
      parentId ? `Item "${parentId}" is not a folder.` : 'Parent item is not a folder.'
    );
    this.name = 'ParentNotAFolderError';
    this.parentId = parentId;
  }
}

export class CannotMoveIntoDescendantError extends FileExplorerError {
  constructor(folderId, targetId) {
    const details = folderId && targetId
      ? ` Cannot move folder "${folderId}" into descendant "${targetId}".`
      : ' Cannot move a folder into itself or its descendants.';
    super(
      ERROR_CODES.CANNOT_MOVE_INTO_SELF_OR_DESCENDANT,
      `Invalid move operation:${details}`
    );
    this.name = 'CannotMoveIntoDescendantError';
    this.folderId = folderId;
    this.targetId = targetId;
  }
}

export class CannotModifyRootError extends FileExplorerError {
  constructor(action = 'modify') {
    super(
      ERROR_CODES.CANNOT_MODIFY_ROOT,
      `Cannot ${action} the root folder.`
    );
    this.name = 'CannotModifyRootError';
    this.action = action;
  }
}

export class InvalidSearchOptionsError extends FileExplorerError {
  constructor(reason = 'malformed search options') {
    super(
      ERROR_CODES.INVALID_SEARCH_OPTIONS,
      `Invalid search options: ${reason}.`
    );
    this.name = 'InvalidSearchOptionsError';
  }
}

export class NothingToUndoError extends FileExplorerError {
  constructor() {
    super(ERROR_CODES.NOTHING_TO_UNDO, 'Nothing to undo.');
    this.name = 'NothingToUndoError';
  }
}

export class NothingToRedoError extends FileExplorerError {
  constructor() {
    super(ERROR_CODES.NOTHING_TO_REDO, 'Nothing to redo.');
    this.name = 'NothingToRedoError';
  }
}

export class TransactionFailedError extends FileExplorerError {
  constructor(reason = 'operation failed') {
    const message = reason instanceof Error ? reason.message : reason;
    super(
      ERROR_CODES.TRANSACTION_FAILED,
      `Transaction failed: ${message}.`
    );
    this.name = 'TransactionFailedError';
    if (reason instanceof Error) {
      this.cause = reason;
    }
  }
}
