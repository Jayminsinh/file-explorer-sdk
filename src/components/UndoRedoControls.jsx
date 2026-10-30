import { memo } from 'react'
import { VscDiscard, VscRedo } from 'react-icons/vsc'
import { useUndoRedoState } from '../hooks/useFileExplorer'
import { useExplorerActions } from '../hooks/useExplorerActions'

const buttonClass =
  'rounded p-1.5 text-ink-muted hover:bg-surface-hover hover:text-ink disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-ink-muted'

function UndoRedoControls() {
  const { canUndo, canRedo } = useUndoRedoState()
  const { undo, redo } = useExplorerActions()

  return (
    <div className="flex items-center gap-0.5">
      <button type="button" className={buttonClass} onClick={undo} disabled={!canUndo} aria-label="Undo" title="Undo (Ctrl+Z)">
        <VscDiscard size={16} />
      </button>
      <button type="button" className={buttonClass} onClick={redo} disabled={!canRedo} aria-label="Redo" title="Redo (Ctrl+Shift+Z)">
        <VscRedo size={16} />
      </button>
    </div>
  )
}

export default memo(UndoRedoControls)