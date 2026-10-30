import { FileTree } from './components/FileTree/FileTree.jsx';
import { ThemeToggle } from './components/ThemeToggle.jsx';

function App() {
  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-canvas text-ink">
      <header className="h-10 px-4 flex items-center justify-between border-b border-line bg-surface shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-ink">File Explorer</span>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
        </div>
      </header>
      <div className="flex flex-1 overflow-hidden">
        <aside className="w-64 shrink-0 border-r border-line bg-surface flex flex-col">
          <div className="h-8 px-3 flex items-center border-b border-line text-xs font-semibold uppercase tracking-wider text-ink-muted">
            Explorer
          </div>
          <div className="flex-1 overflow-y-auto">
            <FileTree />
          </div>
        </aside>
        <main className="flex-1 overflow-auto bg-canvas p-6">
          {/* Main content */}
        </main>
      </div>
    </div>
  );
}

export default App;