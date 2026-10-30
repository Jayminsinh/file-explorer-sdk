import {
  ItemNotFoundError,
  ParentNotAFolderError,
  InvalidNameError,
  DuplicateNameError,
} from './errors.js';
import { EventEmitter } from './emitter.js';

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
    parent.childIds.push(id);

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
}
