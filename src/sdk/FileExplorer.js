import { ItemNotFoundError } from './errors.js';
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
}
