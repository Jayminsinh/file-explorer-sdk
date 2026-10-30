import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { ThemeProvider } from './context/ThemeContext.jsx'
import { ExplorerProvider } from './context/ExplorerContext.jsx'
import { FeedbackProvider } from './context/FeedbackContext.jsx'
import { UiStateProvider } from './context/UiStateContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <ExplorerProvider>
        <FeedbackProvider>
          <UiStateProvider>
            <App />
          </UiStateProvider>
        </FeedbackProvider>
      </ExplorerProvider>
    </ThemeProvider>
  </StrictMode>,
)
