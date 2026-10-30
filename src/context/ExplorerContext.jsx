import { createContext, useContext, useRef } from 'react';
import { FileExplorer } from '../sdk/index.js';

const ExplorerContext = createContext(null);

export function ExplorerProvider({ explorer: propExplorer, children }) {
  const instanceRef = useRef(null);
  if (!propExplorer && !instanceRef.current) {
    instanceRef.current = new FileExplorer();
  }

  const explorer = propExplorer || instanceRef.current;

  return (
    <ExplorerContext.Provider value={explorer}>
      {children}
    </ExplorerContext.Provider>
  );
}

export function useExplorer() {
  const context = useContext(ExplorerContext);
  if (!context) {
    throw new Error('useExplorer must be used within an ExplorerProvider');
  }
  return context;
}
