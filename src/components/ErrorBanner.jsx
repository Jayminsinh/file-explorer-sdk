import { memo } from 'react';
import { VscError, VscClose } from 'react-icons/vsc';
import { useFeedbackError, useFeedbackActions } from '../context/FeedbackContext.jsx';

export const ErrorBanner = memo(function ErrorBanner() {
  const error = useFeedbackError();
  const { clearError } = useFeedbackActions();

  if (!error) return null;

  return (
    <div
      role="alert"
      className="flex items-center justify-between gap-2 px-3 py-1.5 border-b border-l-2 border-line border-l-danger bg-surface text-xs shrink-0"
    >
      <div className="flex items-center gap-2 min-w-0">
        <VscError className="w-4 h-4 text-danger shrink-0" aria-hidden="true" />
        <span className="truncate text-ink">{error.message}</span>
      </div>
      <button
        type="button"
        onClick={clearError}
        aria-label="Dismiss error"
        className="p-1 rounded text-ink-muted hover:text-ink hover:bg-surface-hover focus:outline-none shrink-0"
      >
        <VscClose className="w-4 h-4" />
      </button>
    </div>
  );
});
