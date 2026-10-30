import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { ExplorerProvider } from './context/ExplorerContext.jsx'
import { UiStateProvider } from './context/UiStateContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ExplorerProvider>
      <UiStateProvider>
        <App />
      </UiStateProvider>
    </ExplorerProvider>
  </StrictMode>,
)
