import { screen, fireEvent } from '@testing-library/react';
import { ErrorBanner } from '../../src/components/ErrorBanner.jsx';
import { useFeedbackActions } from '../../src/context/FeedbackContext.jsx';
import { renderWithProviders } from './renderWithProviders.jsx';

function ErrorHarness() {
  const { reportError, clearError } = useFeedbackActions();
  return (
    <div>
      <ErrorBanner />
      <button onClick={() => reportError('First error')}>Trigger 1</button>
      <button onClick={() => reportError(new Error('Second error'))}>Trigger 2</button>
      <button onClick={clearError}>Clear</button>
    </div>
  );
}

describe('ErrorBanner', () => {
  it('renders nothing when there is no error', () => {
    renderWithProviders(<ErrorBanner />);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows the message with role="alert" after an error is reported', () => {
    renderWithProviders(<ErrorHarness />);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('Trigger 1'));
    const alert = screen.getByRole('alert');
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveTextContent('First error');
  });

  it('the dismiss button (aria-label "Dismiss error") clears it', () => {
    renderWithProviders(<ErrorHarness />);
    fireEvent.click(screen.getByText('Trigger 1'));
    expect(screen.getByRole('alert')).toBeInTheDocument();

    const dismissButton = screen.getByRole('button', { name: 'Dismiss error' });
    fireEvent.click(dismissButton);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('a new error replaces the old one', () => {
    renderWithProviders(<ErrorHarness />);
    fireEvent.click(screen.getByText('Trigger 1'));
    expect(screen.getByRole('alert')).toHaveTextContent('First error');

    fireEvent.click(screen.getByText('Trigger 2'));
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Second error');
    expect(screen.queryByText('First error')).not.toBeInTheDocument();
  });
});
