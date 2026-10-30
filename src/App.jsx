import { FileTree } from './components/FileTree/FileTree.jsx';

function App() {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-neutral-950 text-neutral-200">
      <aside className="w-64 shrink-0 border-r border-neutral-800 bg-neutral-900 flex flex-col">
        <div className="h-8 px-3 flex items-center border-b border-neutral-800 text-xs font-semibold uppercase tracking-wider text-neutral-400">
          Explorer
        </div>
        <div className="flex-1 overflow-y-auto">
          <FileTree />
        </div>
      </aside>
      <main className="flex-1 overflow-auto bg-neutral-950 p-6">
        {/* Main content */}
      </main>
    </div>
  );
}

export default App;