import {
  ItemNotFoundError,
  ParentNotAFolderError,
  InvalidNameError,
  DuplicateNameError,
  CannotModifyRootError,
  CannotMoveIntoDescendantError,
  TransactionFailedError,
} from './errors.js';
import { EventEmitter } from './emitter.js';
import { History } from './history.js';
import { search } from './search.js';

function deepFreeze(obj) {
  if (!obj || typeof obj !== 'object' || Object.isFrozen(obj)) {
    return obj;
  }
  Object.freeze(obj);
  for (const value of Object.values(obj)) {
    deepFreeze(value);
  }
  return obj;
}

function cloneNodes(nodes) {
  const copy = new Map();
  for (const [id, node] of nodes) {
    const cloned = { ...node };
    if (node.childIds) {
      cloned.childIds = [...node.childIds];
    }
    copy.set(id, cloned);
  }
  return copy;
}

function areNodesEqual(nodesA, nodesB) {
  if (nodesA.size !== nodesB.size) return false;
  for (const [id, a] of nodesA) {
    const b = nodesB.get(id);
    if (!b) return false;
    if (a.name !== b.name || a.type !== b.type || a.parentId !== b.parentId) return false;
    if (a.childIds || b.childIds) {
      if (!a.childIds || !b.childIds) return false;
      if (a.childIds.length !== b.childIds.length) return false;
      for (let i = 0; i < a.childIds.length; i++) {
        if (a.childIds[i] !== b.childIds[i]) return false;
      }
    }
  }
  return true;
}

export class FileExplorer {
  #nodes = new Map();
  #rootId;
  #emitter = new EventEmitter();
  #cachedSnapshot = null;
  #history = new History();
  #inTransaction = false;

  constructor() {
    const rootId = crypto.randomUUID();
    const docsId = crypto.randomUUID();
    const imagesId = crypto.randomUUID();
    const notesId = crypto.randomUUID();
    const resumeId = crypto.randomUUID();
    const planId = crypto.randomUUID();
    const photoId = crypto.randomUUID();
    const logoId = crypto.randomUUID();

    this.#rootId = rootId;

    this.#nodes.set(rootId, {
      id: rootId,
      name: 'My Files',
      type: 'folder',
      parentId: null,
      childIds: [docsId, imagesId, notesId],
    });

    this.#nodes.set(docsId, {
      id: docsId,
      name: 'Documents',
      type: 'folder',
      parentId: rootId,
      childIds: [resumeId, planId],
    });

    this.#nodes.set(resumeId, {
      id: resumeId,
      name: 'Resume.pdf',
      type: 'file',
      parentId: docsId,
    });

    this.#nodes.set(planId, {
      id: planId,
      name: 'Project Plan.docx',
      type: 'file',
      parentId: docsId,
    });

    this.#nodes.set(imagesId, {
      id: imagesId,
      name: 'Images',
      type: 'folder',
      parentId: rootId,
      childIds: [photoId, logoId],
    });

    this.#nodes.set(photoId, {
      id: photoId,
      name: 'Photo.png',
      type: 'file',
      parentId: imagesId,
    });

    this.#nodes.set(logoId, {
      id: logoId,
      name: 'Logo.svg',
      type: 'file',
      parentId: imagesId,
    });

    this.#nodes.set(notesId, {
      id: notesId,
      name: 'Notes.txt',
      type: 'file',
      parentId: rootId,
    });
  }

  #buildTree(id, nodes = this.#nodes) {
    const node = nodes.get(id);
    if (!node) return null;

    if (node.type === 'folder') {
      return {
        id: node.id,
        name: node.name,
        type: node.type,
        parentId: node.parentId,
        children: node.childIds.map((childId) => this.#buildTree(childId, nodes)),
      };
    }

    return {
      id: node.id,
      name: node.name,
      type: node.type,
      parentId: node.parentId,
    };
  }

  #notifyChange() {
    this.#cachedSnapshot = null;
    this.#emitter.emit(this.getSnapshot());
  }

  getTree() {
    return this.#buildTree(this.#rootId);
  }

  getItem(id) {
    const node = this.#nodes.get(id);
    if (!node) {
      throw new ItemNotFoundError(id);
    }

    return {
      id: node.id,
      name: node.name,
      type: node.type,
      parentId: node.parentId,
    };
  }

  getSnapshot() {
    if (!this.#cachedSnapshot) {
      this.#cachedSnapshot = deepFreeze(this.getTree());
    }
    return this.#cachedSnapshot;
  }

  subscribe(listener) {
    return this.#emitter.subscribe(listener);
  }

  #validateName(name) {
    if (typeof name !== 'string') {
      throw new InvalidNameError(name);
    }
    const trimmed = name.trim();
    if (!trimmed || trimmed.includes('/') || trimmed.includes('\\')) {
      throw new InvalidNameError(name);
    }
    return trimmed;
  }

  #checkDuplicateName(nodes, parentId, name, excludeId = null) {
    const parent = nodes.get(parentId);
    if (!parent || !parent.childIds) return;

    const lower = name.toLowerCase();
    for (const childId of parent.childIds) {
      if (excludeId && childId === excludeId) continue;
      const child = nodes.get(childId);
      if (child && child.name.toLowerCase() === lower) {
        throw new DuplicateNameError(name, parentId);
      }
    }
  }

  #applyCreate(nodes, parentId, name, type) {
    const parent = nodes.get(parentId);
    if (!parent) {
      throw new ItemNotFoundError(parentId);
    }
    if (parent.type !== 'folder') {
      throw new ParentNotAFolderError(parentId);
    }

    const trimmedName = this.#validateName(name);
    this.#checkDuplicateName(nodes, parentId, trimmedName);

    const id = crypto.randomUUID();
    const node = {
      id,
      name: trimmedName,
      type,
      parentId,
    };

    if (type === 'folder') {
      node.childIds = [];
    }

    nodes.set(id, node);
    const index = parent.childIds.length;
    parent.childIds.push(id);

    return {
      item: {
        id: node.id,
        name: node.name,
        type: node.type,
        parentId: node.parentId,
      },
      entry: {
        type: 'create',
        node: {
          id: node.id,
          name: node.name,
          type: node.type,
          parentId: node.parentId,
          childIds: node.childIds ? [...node.childIds] : undefined,
        },
        parentId,
        index,
      },
    };
  }

  createFile(parentId, name) {
    const { item, entry } = this.#applyCreate(this.#nodes, parentId, name, 'file');
    this.#history.push(entry);
    this.#notifyChange();
    return item;
  }

  createFolder(parentId, name) {
    const { item, entry } = this.#applyCreate(this.#nodes, parentId, name, 'folder');
    this.#history.push(entry);
    this.#notifyChange();
    return item;
  }

  #applyRename(nodes, id, newName) {
    const item = nodes.get(id);
    if (!item) {
      throw new ItemNotFoundError(id);
    }
    if (id === this.#rootId || item.parentId === null) {
      throw new CannotModifyRootError('rename');
    }

    const trimmedName = this.#validateName(newName);
    if (trimmedName === item.name) {
      return {
        item: {
          id: item.id,
          name: item.name,
          type: item.type,
          parentId: item.parentId,
        },
        changed: false,
      };
    }

    this.#checkDuplicateName(nodes, item.parentId, trimmedName, id);

    const oldName = item.name;
    item.name = trimmedName;

    return {
      item: {
        id: item.id,
        name: item.name,
        type: item.type,
        parentId: item.parentId,
      },
      changed: true,
      entry: {
        type: 'rename',
        id,
        oldName,
        newName: trimmedName,
      },
    };
  }

  renameItem(id, newName) {
    const { item, changed, entry } = this.#applyRename(this.#nodes, id, newName);
    if (changed) {
      this.#history.push(entry);
      this.#notifyChange();
    }
    return item;
  }

  #applyMove(nodes, id, newParentId) {
    const item = nodes.get(id);
    if (!item) {
      throw new ItemNotFoundError(id);
    }
    if (id === this.#rootId || item.parentId === null) {
      throw new CannotModifyRootError('move');
    }

    const newParent = nodes.get(newParentId);
    if (!newParent) {
      throw new ItemNotFoundError(newParentId);
    }
    if (newParent.type !== 'folder') {
      throw new ParentNotAFolderError(newParentId);
    }

    if (item.parentId === newParentId) {
      return {
        item: {
          id: item.id,
          name: item.name,
          type: item.type,
          parentId: item.parentId,
        },
        changed: false,
      };
    }

    // A folder cannot be moved into itself or into any of its descendants
    if (item.type === 'folder') {
      let current = newParent;
      while (current) {
        if (current.id === id) {
          throw new CannotMoveIntoDescendantError(id, newParentId);
        }
        current = current.parentId ? nodes.get(current.parentId) : null;
      }
    }

    this.#checkDuplicateName(nodes, newParentId, item.name);

    const oldParentId = item.parentId;
    const oldParent = nodes.get(oldParentId);
    const oldIndex = oldParent && oldParent.childIds ? oldParent.childIds.indexOf(id) : -1;

    if (oldParent && oldParent.childIds && oldIndex !== -1) {
      oldParent.childIds.splice(oldIndex, 1);
    }

    newParent.childIds.push(id);
    item.parentId = newParentId;

    return {
      item: {
        id: item.id,
        name: item.name,
        type: item.type,
        parentId: item.parentId,
      },
      changed: true,
      entry: {
        type: 'move',
        id,
        oldParentId,
        oldIndex,
        newParentId,
      },
    };
  }

  moveItem(id, newParentId) {
    const { item, changed, entry } = this.#applyMove(this.#nodes, id, newParentId);
    if (changed) {
      this.#history.push(entry);
      this.#notifyChange();
    }
    return item;
  }

  #removeSubtree(id, nodes = this.#nodes) {
    const item = nodes.get(id);
    const parentId = item.parentId;
    const parent = nodes.get(parentId);
    const index = parent && parent.childIds ? parent.childIds.indexOf(id) : -1;

    if (parent && index !== -1) {
      parent.childIds.splice(index, 1);
    }

    const removedNodes = [];
    const queue = [id];

    while (queue.length > 0) {
      const currentId = queue.shift();
      const node = nodes.get(currentId);
      if (node) {
        removedNodes.push({ ...node, childIds: node.childIds ? [...node.childIds] : undefined });
        if (node.type === 'folder' && node.childIds) {
          queue.push(...node.childIds);
        }
        nodes.delete(currentId);
      }
    }

    return {
      nodes: removedNodes,
      parentId,
      index,
    };
  }

  #applyDelete(nodes, id) {
    const item = nodes.get(id);
    if (!item) {
      throw new ItemNotFoundError(id);
    }
    if (id === this.#rootId || item.parentId === null) {
      throw new CannotModifyRootError('delete');
    }

    const deletedTree = this.#buildTree(id, nodes);
    const { nodes: removedNodes, parentId, index } = this.#removeSubtree(id, nodes);

    return {
      item: deletedTree,
      changed: true,
      entry: {
        type: 'delete',
        nodes: removedNodes,
        parentId,
        index,
      },
    };
  }

  deleteItem(id) {
    const { item, entry } = this.#applyDelete(this.#nodes, id);
    this.#history.push(entry);
    this.#notifyChange();
    return item;
  }

  transaction(callback) {
    if (typeof callback !== 'function') {
      throw new TransactionFailedError('callback must be a function');
    }
    if (this.#inTransaction) {
      throw new TransactionFailedError('nested transactions are not supported');
    }

    this.#inTransaction = true;
    const beforeCopy = cloneNodes(this.#nodes);
    const workingNodes = cloneNodes(this.#nodes);
    let hasChanges = false;

    const tx = {
      createFile: (parentId, name) => {
        const { item } = this.#applyCreate(workingNodes, parentId, name, 'file');
        hasChanges = true;
        return item;
      },
      createFolder: (parentId, name) => {
        const { item } = this.#applyCreate(workingNodes, parentId, name, 'folder');
        hasChanges = true;
        return item;
      },
      renameItem: (id, newName) => {
        const { item, changed } = this.#applyRename(workingNodes, id, newName);
        if (changed) hasChanges = true;
        return item;
      },
      moveItem: (id, newParentId) => {
        const { item, changed } = this.#applyMove(workingNodes, id, newParentId);
        if (changed) hasChanges = true;
        return item;
      },
      deleteItem: (id) => {
        const { item } = this.#applyDelete(workingNodes, id);
        hasChanges = true;
        return item;
      },
    };

    let result;
    try {
      result = callback(tx);
      if (result && typeof result.then === 'function') {
        throw new TransactionFailedError('async callbacks are not supported');
      }
    } catch (err) {
      if (err instanceof TransactionFailedError) {
        throw err;
      }
      const message = err instanceof Error ? err.message : String(err || 'operation failed');
      throw new TransactionFailedError(message, err);
    } finally {
      this.#inTransaction = false;
    }

    if (!hasChanges || areNodesEqual(beforeCopy, workingNodes)) {
      return result;
    }

    this.#nodes = workingNodes;
    this.#history.push({
      type: 'transaction',
      before: beforeCopy,
      after: cloneNodes(workingNodes),
    });
    this.#notifyChange();

    return result;
  }

  undo() {
    const entry = this.#history.undo();
    let description;

    switch (entry.type) {
      case 'create': {
        const parent = this.#nodes.get(entry.parentId);
        if (parent && parent.childIds) {
          parent.childIds = parent.childIds.filter((cid) => cid !== entry.node.id);
        }
        this.#nodes.delete(entry.node.id);
        description = {
          action: 'create',
          type: 'create',
          id: entry.node.id,
          name: entry.node.name,
        };
        break;
      }

      case 'rename': {
        const item = this.#nodes.get(entry.id);
        if (item) {
          item.name = entry.oldName;
        }
        description = {
          action: 'rename',
          type: 'rename',
          id: entry.id,
          name: entry.oldName,
        };
        break;
      }

      case 'move': {
        const item = this.#nodes.get(entry.id);
        const newParent = this.#nodes.get(entry.newParentId);
        if (newParent && newParent.childIds) {
          newParent.childIds = newParent.childIds.filter((cid) => cid !== entry.id);
        }

        const oldParent = this.#nodes.get(entry.oldParentId);
        if (oldParent && oldParent.childIds) {
          if (entry.oldIndex >= 0 && entry.oldIndex <= oldParent.childIds.length) {
            oldParent.childIds.splice(entry.oldIndex, 0, entry.id);
          } else {
            oldParent.childIds.push(entry.id);
          }
        }

        if (item) {
          item.parentId = entry.oldParentId;
        }

        description = {
          action: 'move',
          type: 'move',
          id: entry.id,
          name: item ? item.name : undefined,
        };
        break;
      }

      case 'delete': {
        for (const node of entry.nodes) {
          this.#nodes.set(node.id, {
            ...node,
            childIds: node.childIds ? [...node.childIds] : undefined,
          });
        }

        const parent = this.#nodes.get(entry.parentId);
        const rootDeletedId = entry.nodes[0].id;
        if (parent && parent.childIds) {
          if (entry.index >= 0 && entry.index <= parent.childIds.length) {
            parent.childIds.splice(entry.index, 0, rootDeletedId);
          } else {
            parent.childIds.push(rootDeletedId);
          }
        }

        description = {
          action: 'delete',
          type: 'delete',
          id: rootDeletedId,
          name: entry.nodes[0].name,
        };
        break;
      }

      case 'transaction': {
        this.#nodes = cloneNodes(entry.before);
        description = {
          action: 'transaction',
          type: 'transaction',
        };
        break;
      }
    }

    this.#notifyChange();
    return description;
  }

  redo() {
    const entry = this.#history.redo();
    let description;

    switch (entry.type) {
      case 'create': {
        const nodeCopy = {
          ...entry.node,
          childIds: entry.node.childIds ? [...entry.node.childIds] : undefined,
        };
        this.#nodes.set(nodeCopy.id, nodeCopy);

        const parent = this.#nodes.get(entry.parentId);
        if (parent && parent.childIds) {
          if (entry.index >= 0 && entry.index <= parent.childIds.length) {
            parent.childIds.splice(entry.index, 0, nodeCopy.id);
          } else {
            parent.childIds.push(nodeCopy.id);
          }
        }

        description = {
          action: 'create',
          type: 'create',
          id: entry.node.id,
          name: entry.node.name,
        };
        break;
      }

      case 'rename': {
        const item = this.#nodes.get(entry.id);
        if (item) {
          item.name = entry.newName;
        }
        description = {
          action: 'rename',
          type: 'rename',
          id: entry.id,
          name: entry.newName,
        };
        break;
      }

      case 'move': {
        const item = this.#nodes.get(entry.id);
        const oldParent = this.#nodes.get(entry.oldParentId);
        if (oldParent && oldParent.childIds) {
          oldParent.childIds = oldParent.childIds.filter((cid) => cid !== entry.id);
        }

        const newParent = this.#nodes.get(entry.newParentId);
        if (newParent && newParent.childIds) {
          newParent.childIds.push(entry.id);
        }

        if (item) {
          item.parentId = entry.newParentId;
        }

        description = {
          action: 'move',
          type: 'move',
          id: entry.id,
          name: item ? item.name : undefined,
        };
        break;
      }

      case 'delete': {
        const rootDeletedId = entry.nodes[0].id;
        const parent = this.#nodes.get(entry.parentId);
        if (parent && parent.childIds) {
          parent.childIds = parent.childIds.filter((cid) => cid !== rootDeletedId);
        }

        for (const node of entry.nodes) {
          this.#nodes.delete(node.id);
        }

        description = {
          action: 'delete',
          type: 'delete',
          id: rootDeletedId,
          name: entry.nodes[0].name,
        };
        break;
      }

      case 'transaction': {
        this.#nodes = cloneNodes(entry.after);
        description = {
          action: 'transaction',
          type: 'transaction',
        };
        break;
      }
    }

    this.#notifyChange();
    return description;
  }

  canUndo() {
    return this.#history.canUndo();
  }

  canRedo() {
    return this.#history.canRedo();
  }

  searchItems(options = {}) {
    return search(this.#nodes, options);
  }
}
