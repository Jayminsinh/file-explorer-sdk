export function indexTree(root) {
  const index = new Map()
  const visit = (node) => {
    index.set(node.id, {
      id: node.id,
      name: node.name,
      type: node.type,
      parentId: node.parentId,
    })
    node.children?.forEach(visit)
  }
  visit(root)
  return index
}

export function getAncestors(index, id) {
  const ancestors = []
  let current = index.get(id)
  while (current && current.parentId != null) {
    current = index.get(current.parentId)
    if (current) ancestors.unshift(current)
  }
  return ancestors
}

export function getLocation(index, id) {
  return getAncestors(index, id)
    .map((item) => item.name)
    .join(' / ')
}

export function countDescendants(node) {
  return (node.children ?? []).reduce(
    (total, child) => total + 1 + countDescendants(child),
    0
  )
}