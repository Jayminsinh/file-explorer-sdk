import {
  ItemNotFoundError,
  ParentNotAFolderError,
  InvalidNameError,
  DuplicateNameError,
  CannotModifyRootError,
  CannotMoveIntoDescendantError,
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

export class FileExplorer {
  #nodes = new Map();
  #rootId;
  #emitter = new EventEmitter();
  #cachedSnapshot = null;
  #history = new History();

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

  #buildTree(id) {
    const node = this.#nodes.get(id);
    if (!node) return null;

    if (node.type === 'folder') {
      return {
        id: node.id,
        name: node.name,
        type: node.type,
        parentId: node.parentId,
        children: node.childIds.map((childId) => this.#buildTree(childId)),
      };
    }

    return {
      id: node.id,
      name: node.name,
      type: node.type,
      parentId: node.parentId,
    };
  }

  // To be called by future mutation methods
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

  #checkDuplicateName(parentId, name, excludeId = null) {
    const parent = this.#nodes.get(parentId);
    if (!parent || !parent.childIds) return;

    const lower = name.toLowerCase();
    for (const childId of parent.childIds) {
      if (excludeId && childId === excludeId) continue;
      const child = this.#nodes.get(childId);
      if (child && child.name.toLowerCase() === lower) {
        throw new DuplicateNameError(name, parentId);
      }
    }
  }

  #createItem(parentId, name, type) {
    const parent = this.#nodes.get(parentId);
    if (!parent) {
      throw new ItemNotFoundError(parentId);
    }
    if (parent.type !== 'folder') {
      throw new ParentNotAFolderError(parentId);
    }

    const trimmedName = this.#validateName(name);
    this.#checkDuplicateName(parentId, trimmedName);

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

    this.#nodes.set(id, node);
    const index = parent.childIds.length;
    parent.childIds.push(id);

    this.#history.push({
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
    });

    this.#notifyChange();

    return {
      id: node.id,
      name: node.name,
      type: node.type,
      parentId: node.parentId,
    };
  }

  createFile(parentId, name) {
    return this.#createItem(parentId, name, 'file');
  }

  createFolder(parentId, name) {
    return this.#createItem(parentId, name, 'folder');
  }

  renameItem(id, newName) {
    const item = this.#nodes.get(id);
    if (!item) {
      throw new ItemNotFoundError(id);
    }
    if (id === this.#rootId || item.parentId === null) {
      throw new CannotModifyRootError('rename');
    }

    const trimmedName = this.#validateName(newName);
    if (trimmedName === item.name) {
      return {
        id: item.id,
        name: item.name,
        type: item.type,
        parentId: item.parentId,
      };
    }

    this.#checkDuplicateName(item.parentId, trimmedName, id);

    const oldName = item.name;
    item.name = trimmedName;

    this.#history.push({
      type: 'rename',
      id,
      oldName,
      newName: trimmedName,
    });

    this.#notifyChange();

    return {
      id: item.id,
      name: item.name,
      type: item.type,
      parentId: item.parentId,
    };
  }

  moveItem(id, newParentId) {
    const item = this.#nodes.get(id);
    if (!item) {
      throw new ItemNotFoundError(id);
    }
    if (id === this.#rootId || item.parentId === null) {
      throw new CannotModifyRootError('move');
    }

    const newParent = this.#nodes.get(newParentId);
    if (!newParent) {
      throw new ItemNotFoundError(newParentId);
    }
    if (newParent.type !== 'folder') {
      throw new ParentNotAFolderError(newParentId);
    }

    if (item.parentId === newParentId) {
      return {
        id: item.id,
        name: item.name,
        type: item.type,
        parentId: item.parentId,
      };
    }

    // A folder cannot be moved into itself or into any of its descendants
    if (item.type === 'folder') {
      let current = newParent;
      while (current) {
        if (current.id === id) {
          throw new CannotMoveIntoDescendantError(id, newParentId);
        }
        current = current.parentId ? this.#nodes.get(current.parentId) : null;
      }
    }

    this.#checkDuplicateName(newParentId, item.name);

    const oldParentId = item.parentId;
    const oldParent = this.#nodes.get(oldParentId);
    const oldIndex = oldParent && oldParent.childIds ? oldParent.childIds.indexOf(id) : -1;

    if (oldParent && oldParent.childIds && oldIndex !== -1) {
      oldParent.childIds.splice(oldIndex, 1);
    }

    newParent.childIds.push(id);
    item.parentId = newParentId;

    this.#history.push({
      type: 'move',
      id,
      oldParentId,
      oldIndex,
      newParentId,
    });

    this.#notifyChange();

    return {
      id: item.id,
      name: item.name,
      type: item.type,
      parentId: item.parentId,
    };
  }

  #removeSubtree(id) {
    const item = this.#nodes.get(id);
    const parentId = item.parentId;
    const parent = this.#nodes.get(parentId);
    const index = parent && parent.childIds ? parent.childIds.indexOf(id) : -1;

    if (parent && index !== -1) {
      parent.childIds.splice(index, 1);
    }

    const removedNodes = [];
    const queue = [id];

    while (queue.length > 0) {
      const currentId = queue.shift();
      const node = this.#nodes.get(currentId);
      if (node) {
        removedNodes.push({ ...node, childIds: node.childIds ? [...node.childIds] : undefined });
        if (node.type === 'folder' && node.childIds) {
          queue.push(...node.childIds);
        }
        this.#nodes.delete(currentId);
      }
    }

    return {
      nodes: removedNodes,
      parentId,
      index,
    };
  }

  deleteItem(id) {
    const item = this.#nodes.get(id);
    if (!item) {
      throw new ItemNotFoundError(id);
    }
    if (id === this.#rootId || item.parentId === null) {
      throw new CannotModifyRootError('delete');
    }

    const deletedTree = this.#buildTree(id);
    const { nodes, parentId, index } = this.#removeSubtree(id);

    this.#history.push({
      type: 'delete',
      nodes,
      parentId,
      index,
    });

    this.#notifyChange();

    return deletedTree;
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
