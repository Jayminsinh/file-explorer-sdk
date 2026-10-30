import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useExplorer } from './ExplorerContext'
import { indexTree } from '../utils/tree'

const ActivityContext = createContext(null)
const MAX_ENTRIES = 50

function summarize(verb, items, existing) {
  const topLevel = items.filter((item) => existing.has(item.parentId))
  if (topLevel.length === 1) {
    const nested = items.length - 1
    const suffix = nested ? ` and ${nested} nested item${nested > 1 ? 's' : ''}` : ''
    return `${verb} ${topLevel[0].name}${suffix}`
  }
  return `${verb} ${topLevel.length} items`
}

function describeChanges(before, after) {
  const changes = []
  const created = []
  const removed = []

  for (const [id, item] of after) {
    const old = before.get(id)
    if (!old) {
      created.push(item)
      continue
    }
    if (old.name !== item.name) {
      changes.push({ type: 'rename', text: `Renamed ${old.name} to ${item.name}` })
    }
    if (old.parentId !== item.parentId) {
      const target = after.get(item.parentId)?.name ?? 'root'
      changes.push({ type: 'move', text: `Moved ${item.name} to ${target}` })
    }
  }

  for (const [id, item] of before) {
    if (!after.has(id)) removed.push(item)
  }

  if (created.length) changes.push({ type: 'create', text: summarize('Created', created, before) })
  if (removed.length) changes.push({ type: 'delete', text: summarize('Deleted', removed, after) })

  if (changes.length === 0) return null
  if (changes.length > 1) {
    return { type: 'transaction', text: `${changes.length} changes applied together` }
  }
  return changes[0]
}

export function ActivityProvider({ children }) {
  const explorer = useExplorer()
  const [entries, setEntries] = useState([])
  const previous = useRef(null)
  const counter = useRef(0)

  useEffect(() => {
    previous.current = indexTree(explorer.getSnapshot())

    const unsubscribe = explorer.subscribe(() => {
      const current = indexTree(explorer.getSnapshot())
      const summary = describeChanges(previous.current, current)
      previous.current = current
      if (!summary) return
      setEntries((list) =>
        [{ id: counter.current++, time: Date.now(), ...summary }, ...list].slice(0, MAX_ENTRIES)
      )
    })

    return unsubscribe
  }, [explorer])

  const clear = useCallback(() => setEntries([]), [])
  const value = useMemo(() => ({ entries, clear }), [entries, clear])

  return <ActivityContext.Provider value={value}>{children}</ActivityContext.Provider>
}

export function useActivity() {
  const context = useContext(ActivityContext)
  if (!context) throw new Error('useActivity must be used inside ActivityProvider')
  return context
}