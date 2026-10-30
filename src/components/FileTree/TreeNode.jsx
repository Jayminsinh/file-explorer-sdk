import { memo, useCallback, useMemo } from 'react'
import {
  VscChevronDown,
  VscChevronRight,
  VscFile,
  VscFolder,
  VscFolderOpened,
} from 'react-icons/vsc'
import { useIsExpanded, useIsSelected, useUiActions } from '../../context/UiStateContext'
import { useIsChecked, useMultiSelectActions } from '../../context/MultiSelectContext'

const byName = (a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })

function sortChildren(children = []) {
  const folders = children.filter((child) => child.type === 'folder').sort(byName)
  const files = children.filter((child) => child.type !== 'folder').sort(byName)
  return [...folders, ...files]
}

function TreeNodeBase({ node, depth }) {
  console.log(`render TreeNode: ${node.name}`)

  const isFolder = node.type === 'folder'
  const isRoot = node.parentId == null
  const isExpanded = useIsExpanded(node.id)
  const isSelected = useIsSelected(node.id)
  const isChecked = useIsChecked(node.id)
  const { toggleExpanded, select } = useUiActions()
  const { toggle } = useMultiSelectActions()
  const children = useMemo(() => sortChildren(node.children), [node.children])

  const handleSelect = useCallback(
    (event) => {
      if (event.ctrlKey || event.metaKey) {
        toggle(node.id)
        return
      }
      select(node.id)
    },
    [node.id, select, toggle]
  )
  const handleToggle = useCallback(() => toggleExpanded(node.id), [node.id, toggleExpanded])
  const handleCheck = useCallback(() => toggle(node.id), [node.id, toggle])

  const Icon = isFolder ? (isExpanded ? VscFolderOpened : VscFolder) : VscFile

  return (
    <div>
      <div
        role="treeitem"
        aria-level={depth + 1}
        aria-expanded={isFolder ? isExpanded : undefined}
        aria-selected={isSelected}
        className={`group relative flex items-center gap-1 pr-2 text-sm leading-6 ${
          isSelected || isChecked ? 'bg-accent-soft' : 'hover:bg-surface-hover'
        }`}
        style={{ paddingLeft: depth * 12 + 4 }}
      >
        {isSelected && <span aria-hidden="true" className="absolute inset-y-0 left-0 w-0.5 bg-accent" />}

        {isFolder ? (
          <button
            type="button"
            onClick={handleToggle}
            aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${node.name}`}
            className="grid h-5 w-5 shrink-0 place-items-center rounded text-ink-muted hover:text-ink"
          >
            {isExpanded ? <VscChevronDown size={14} /> : <VscChevronRight size={14} />}
          </button>
        ) : (
          <span aria-hidden="true" className="h-5 w-5 shrink-0" />
        )}

        {!isRoot && (
          <input
            type="checkbox"
            checked={isChecked}
            onChange={handleCheck}
            aria-label={`Select ${node.name}`}
            className="h-3.5 w-3.5 shrink-0 cursor-pointer accent-accent"
          />
        )}

        <button
          type="button"
          onClick={handleSelect}
          className="flex min-w-0 flex-1 items-center gap-1.5 py-0.5 text-left text-ink"
        >
          <Icon size={16} className={isFolder ? 'shrink-0 text-accent' : 'shrink-0 text-ink-muted'} />
          <span className="truncate">{node.name}</span>
        </button>
      </div>

      {isFolder && isExpanded && (
        <div role="group">
          {children.length === 0 ? (
            <p className="py-0.5 text-xs text-ink-muted" style={{ paddingLeft: (depth + 1) * 12 + 28 }}>
              Empty
            </p>
          ) : (
            children.map((child) => <TreeNode key={child.id} node={child} depth={depth + 1} />)
          )}
        </div>
      )}
    </div>
  )
}

export const TreeNode = memo(TreeNodeBase)
export default TreeNode