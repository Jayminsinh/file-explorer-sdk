import { render } from '@testing-library/react';
import { ThemeProvider } from '../../src/context/ThemeContext.jsx';
import { ExplorerProvider } from '../../src/context/ExplorerContext.jsx';
import { FeedbackProvider } from '../../src/context/FeedbackContext.jsx';
import { UiStateProvider } from '../../src/context/UiStateContext.jsx';
import { MultiSelectProvider } from '../../src/context/MultiSelectContext.jsx';
import { FileExplorer } from '../../src/sdk/FileExplorer.js';

export function createWrapper(explorer = new FileExplorer()) {
  return function Wrapper({ children }) {
    return (
      <ThemeProvider>
        <ExplorerProvider explorer={explorer}>
          <FeedbackProvider>
            <UiStateProvider>
              <MultiSelectProvider>
                {children}
              </MultiSelectProvider>
            </UiStateProvider>
          </FeedbackProvider>
        </ExplorerProvider>
      </ThemeProvider>
    );
  };
}

export function renderWithProviders(ui, options = {}) {
  const { explorer = new FileExplorer(), ...renderOptions } = options;
  const Wrapper = createWrapper(explorer);
  const result = render(ui, { wrapper: Wrapper, ...renderOptions });
  return { ...result, explorer };
}