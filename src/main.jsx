import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { ThemeProvider } from './context/ThemeContext'
import { ExplorerProvider } from './context/ExplorerContext'
import { UiStateProvider } from './context/UiStateContext'
import { FeedbackProvider } from './context/FeedbackContext'
import { ActivityProvider } from './context/ActivityContext'
import { MultiSelectProvider } from './context/MultiSelectContext'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <ExplorerProvider>
       <UiStateProvider>
          <MultiSelectProvider>
            <FeedbackProvider>
              <ActivityProvider>
                <App />
              </ActivityProvider>
            </FeedbackProvider>
          </MultiSelectProvider>
        </UiStateProvider>
      </ExplorerProvider>
    </ThemeProvider>
  </StrictMode>
)