import { useFileExplorerTree } from './hooks/useFileExplorer.js';

function App() {
  const tree = useFileExplorerTree();

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold text-slate-800">{tree?.name}</h1>
      <p className="mt-2 text-sm text-slate-600">
        Direct items: {tree?.children?.length ?? 0}
      </p>
    </div>
  );
}

export default App;