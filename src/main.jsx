import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { ExplorerProvider } from './context/ExplorerContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ExplorerProvider>
      <App />
    </ExplorerProvider>
  </StrictMode>,
)
