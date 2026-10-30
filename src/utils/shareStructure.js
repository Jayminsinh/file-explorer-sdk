// Reuses unchanged nodes from the previous tree so React.memo can skip them.
export function shareStructure(prev, next) {
  if (!prev || prev.id !== next.id) return next

  let children = next.children
  if (children) {
    const before = new Map((prev.children ?? []).map((child) => [child.id, child]))
    children = children.map((child) => shareStructure(before.get(child.id), child))
  }

  const sameFields =
    prev.name === next.name && prev.type === next.type && prev.parentId === next.parentId
  const sameChildren =
    prev.children?.length === children?.length &&
    (children ?? []).every((child, index) => child === prev.children[index])

  if (sameFields && sameChildren) return prev

  const result = { ...next }
  if (children) result.children = Object.freeze(children)
  return Object.freeze(result)
}