import { useEffect } from 'react'
import { useExplorerActions } from './useExplorerActions'

export function useUndoRedoShortcuts() {
  const { undo, redo } = useExplorerActions()

  useEffect(() => {
    const onKeyDown = (event) => {
      if (!(event.ctrlKey || event.metaKey)) return
      if (event.target.closest?.('input, textarea, [role="dialog"]')) return

      const key = event.key.toLowerCase()
      if (key === 'z' && !event.shiftKey) {
        event.preventDefault()
        undo()
      } else if ((key === 'z' && event.shiftKey) || key === 'y') {
        event.preventDefault()
        redo()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [undo, redo])
}