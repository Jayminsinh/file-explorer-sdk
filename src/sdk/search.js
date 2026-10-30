import { InvalidSearchOptionsError } from './errors.js';

function getLocation(parentId, nodes) {
  const parts = [];
  let currentId = parentId;

  while (currentId) {
    const current = nodes.get(currentId);
    if (!current) break;
    parts.unshift(current.name);
    currentId = current.parentId;
  }

  return parts.join(' / ');
}

export function search(nodes, options = {}) {
  if (!options || typeof options !== 'object' || Array.isArray(options)) {
    throw new InvalidSearchOptionsError('options must be an object');
  }

  const {
    query,
    type = 'all',
    sortBy = 'name',
    sortOrder = 'asc',
    page = 1,
    pageSize = 10,
  } = options;

  if (typeof query !== 'string') {
    throw new InvalidSearchOptionsError('query must be a string');
  }

  if (type !== 'all' && type !== 'file' && type !== 'folder') {
    throw new InvalidSearchOptionsError('type must be "all", "file", or "folder"');
  }

  if (sortBy !== 'name' && sortBy !== 'type' && sortBy !== 'path') {
    throw new InvalidSearchOptionsError('sortBy must be "name", "type", or "path"');
  }

  if (sortOrder !== 'asc' && sortOrder !== 'desc') {
    throw new InvalidSearchOptionsError('sortOrder must be "asc" or "desc"');
  }

  if (!Number.isInteger(page) || page < 1) {
    throw new InvalidSearchOptionsError('page must be a positive integer');
  }

  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) {
    throw new InvalidSearchOptionsError('pageSize must be an integer between 1 and 100');
  }

  const trimmedQuery = query.trim();
  if (!trimmedQuery) {
    return {
      items: [],
      total: 0,
      page,
      pageSize,
      totalPages: 0,
    };
  }

  const lowerQuery = trimmedQuery.toLowerCase();
  const matches = [];

  for (const node of nodes.values()) {
    // Exclude the root folder
    if (node.parentId === null) continue;

    if (type !== 'all' && node.type !== type) continue;

    if (node.name.toLowerCase().includes(lowerQuery)) {
      matches.push({
        id: node.id,
        name: node.name,
        type: node.type,
        parentId: node.parentId,
        location: getLocation(node.parentId, nodes),
      });
    }
  }

  matches.sort((a, b) => {
    let cmp = 0;
    if (sortBy === 'name') {
      cmp = a.name.toLowerCase().localeCompare(b.name.toLowerCase());
    } else if (sortBy === 'type') {
      cmp = a.type.localeCompare(b.type);
    } else if (sortBy === 'path') {
      cmp = a.location.localeCompare(b.location);
    }

    if (cmp !== 0) {
      return sortOrder === 'desc' ? -cmp : cmp;
    }

    return a.id.localeCompare(b.id);
  });

  const total = matches.length;
  const totalPages = Math.ceil(total / pageSize);
  const start = (page - 1) * pageSize;
  const items = matches.slice(start, start + pageSize);

  return {
    items,
    total,
    page,
    pageSize,
    totalPages,
  };
}
