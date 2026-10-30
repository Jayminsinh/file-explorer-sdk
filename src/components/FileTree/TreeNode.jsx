import { memo, useMemo, useCallback } from 'react';
import {
  VscChevronRight,
  VscChevronDown,
  VscFolder,
  VscFolderOpened,
  VscFile,
} from 'react-icons/vsc';
import { useIsExpanded, useIsSelected, useUiActions } from '../../context/UiStateContext.jsx';

export const TreeNode = memo(function TreeNode({ node, depth = 0 }) {
  console.log(`render TreeNode: ${node?.name}`);

  const isExpanded = useIsExpanded(node?.id);
  const isSelected = useIsSelected(node?.id);
  const { toggleExpanded, select } = useUiActions();

  const isFolder = node?.type === 'folder';

  const handleRowClick = useCallback(() => {
    select(node.id);
  }, [select, node.id]);

  const handleChevronClick = useCallback((e) => {
    e.stopPropagation();
    toggleExpanded(node.id);
  }, [toggleExpanded, node.id]);

  const sortedChildren = useMemo(() => {
    if (!isFolder || !node.children) return [];

    const folders = [];
    const files = [];

    for (const child of node.children) {
      if (child.type === 'folder') {
        folders.push(child);
      } else {
        files.push(child);
      }
    }

    folders.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
    files.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));

    return [...folders, ...files];
  }, [isFolder, node.children]);

  return (
    <div
      role="treeitem"
      aria-expanded={isFolder ? isExpanded : undefined}
      aria-selected={isSelected}
      className="w-full"
    >
      <div
        onClick={handleRowClick}
        style={{ paddingLeft: `${depth * 16 + 6}px` }}
        className={`group flex items-center h-6 w-full cursor-pointer select-none text-xs text-ink hover:bg-surface-hover border-l-2 ${
          isSelected
            ? 'bg-accent-soft text-ink font-medium border-accent'
            : 'border-transparent'
        }`}
      >
        {isFolder ? (
          <button
            type="button"
            aria-label={isExpanded ? 'Collapse folder' : 'Expand folder'}
            onClick={handleChevronClick}
            className="flex items-center justify-center w-4 h-4 mr-1 text-ink-muted hover:text-ink focus:outline-none rounded shrink-0"
          >
            {isExpanded ? (
              <VscChevronDown className="w-3.5 h-3.5" />
            ) : (
              <VscChevronRight className="w-3.5 h-3.5" />
            )}
          </button>
        ) : (
          <span className="w-4 h-4 mr-1 shrink-0" aria-hidden="true" />
        )}

        <button
          type="button"
          onClick={handleRowClick}
          className="flex items-center flex-1 min-w-0 text-left text-inherit focus:outline-none rounded px-0.5 truncate"
        >
          <span className="mr-1.5 shrink-0">
            {isFolder ? (
              isExpanded ? (
                <VscFolderOpened className="w-4 h-4 text-accent" />
              ) : (
                <VscFolder className="w-4 h-4 text-accent" />
              )
            ) : (
              <VscFile className="w-4 h-4 text-ink-muted" />
            )}
          </span>
          <span className="truncate">{node.name}</span>
        </button>
      </div>

      {isFolder && isExpanded && (
        <div role="group">
          {sortedChildren.length === 0 ? (
            <div
              style={{ paddingLeft: `${(depth + 1) * 16 + 8}px` }}
              className="h-6 flex items-center text-xs text-ink-muted italic select-none"
            >
              Empty
            </div>
          ) : (
            sortedChildren.map((child) => (
              <TreeNode key={child.id} node={child} depth={depth + 1} />
            ))
          )}
        </div>
      )}
    </div>
  );
});
