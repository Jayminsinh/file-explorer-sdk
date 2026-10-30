import { useMemo } from 'react';
import { useSelectedId } from '../context/UiStateContext.jsx';
import { useFileExplorerTree } from './useFileExplorer.js';

function findNode(node, id) {
  if (!node || !id) return null;
  if (node.id === id) return node;
  if (node.children) {
    for (const child of node.children) {
      const found = findNode(child, id);
      if (found) return found;
    }
  }
  return null;
}

export function useSelectedItem() {
  const selectedId = useSelectedId();
  const tree = useFileExplorerTree();

  return useMemo(() => {
    return findNode(tree, selectedId);
  }, [tree, selectedId]);
}
