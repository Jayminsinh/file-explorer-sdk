import ActivityPanel from './components/ActivityPanel'
import DetailsPanel from './components/DetailsPanel'
import { ErrorBanner } from './components/ErrorBanner.jsx'
import Sidebar from './components/Sidebar'
import { ThemeToggle } from './components/ThemeToggle.jsx'
import UndoRedoControls from './components/UndoRedoControls'
import { useUndoRedoShortcuts } from './hooks/useUndoRedoShortcuts'

function App() {
  useUndoRedoShortcuts()

  return (
    <div className="flex h-screen flex-col bg-canvas text-ink">
      <header className="flex h-11 shrink-0 items-center justify-between border-b border-line bg-surface px-3">
        <h1 className="text-sm font-semibold">File Explorer</h1>
        <div className="flex items-center gap-1">
          <UndoRedoControls />
          <ThemeToggle />
        </div>
      </header>
      <ErrorBanner />
      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <Sidebar />
        <main className="flex min-h-0 min-w-0 flex-1 flex-col">
          <DetailsPanel />
          <ActivityPanel />
        </main>
      </div>
    </div>
  )
}

export default App