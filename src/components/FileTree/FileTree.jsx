import { memo } from 'react'
import { useFileExplorerTree } from '../../hooks/useFileExplorer'
import { TreeNode } from './TreeNode'


function FileTreeBase() {
  const tree = useFileExplorerTree()

  return (
    <div role="tree" aria-label="Files" aria-multiselectable="true" className="py-1 text-ink">
      <TreeNode node={tree} depth={0} />
    </div>
  )
}

export const FileTree = memo(FileTreeBase)
export default FileTree