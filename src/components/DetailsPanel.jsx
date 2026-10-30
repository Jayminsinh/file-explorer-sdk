import { memo, useMemo } from 'react'
import { VscFile, VscFolder } from 'react-icons/vsc'
import { useFileExplorerTree } from '../hooks/useFileExplorer'
import { useSelectedItem } from '../hooks/useSelectedItem'
import { countDescendants, getLocation, indexTree } from '../utils/tree'

function Shell({ children }) {
  return (
    <section aria-label="Details" className="min-h-0 flex-1 overflow-y-auto p-4">
      {children}
    </section>
  )
}

function Row({ label, value }) {
  return (
    <div className="grid grid-cols-[7rem_1fr] gap-2 py-1.5 text-sm">
      <dt className="text-ink-muted">{label}</dt>
      <dd className="min-w-0 break-words text-ink">{value}</dd>
    </div>
  )
}

function DetailsPanel({ selectedCount = 0 }) {
  const tree = useFileExplorerTree()
  const item = useSelectedItem()
  const index = useMemo(() => indexTree(tree), [tree])

  if (selectedCount > 1) {
    return (
      <Shell>
        <p className="text-sm text-ink">{selectedCount} items selected</p>
      </Shell>
    )
  }

  if (!item) {
    return (
      <Shell>
        <p className="text-sm text-ink-muted">Select a file or folder to see its details.</p>
      </Shell>
    )
  }

  const isFolder = item.type === 'folder'
  const Icon = isFolder ? VscFolder : VscFile
  const location = getLocation(index, item.id)
  const parent = item.parentId ? index.get(item.parentId) : null

  return (
    <Shell>
      <div className="mb-3 flex items-center gap-2">
        <Icon size={18} className={isFolder ? 'text-accent' : 'text-ink-muted'} />
        <h2 className="truncate text-base font-semibold text-ink">{item.name}</h2>
      </div>
      <dl className="divide-y divide-line">
        <Row label="Type" value={isFolder ? 'Folder' : 'File'} />
        <Row label="Location" value={location || 'Root'} />
        <Row label="Parent" value={parent ? parent.name : 'None'} />
        {isFolder && <Row label="Direct items" value={item.children?.length ?? 0} />}
        {isFolder && <Row label="Total items" value={countDescendants(item)} />}
        <Row label="ID" value={<code className="text-xs text-ink-muted">{item.id}</code>} />
      </dl>
    </Shell>
  )
}

export default memo(DetailsPanel)