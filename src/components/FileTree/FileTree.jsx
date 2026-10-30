import { useFileExplorerTree } from '../../hooks/useFileExplorer.js';
import { TreeNode } from './TreeNode.jsx';

export function FileTree() {
  const rootNode = useFileExplorerTree();

  if (!rootNode) return null;

  return (
    <div
      role="tree"
      aria-label="File Explorer"
      className="w-full text-ink select-none py-1"
    >
      <TreeNode node={rootNode} depth={0} />
    </div>
  );
}
